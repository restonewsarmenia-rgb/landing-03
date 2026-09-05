/* =============================================================================
   LIVE DEMO ENGINE — Globus, холодные звонки 2.

   The board's markup and styles are frozen Figma output. This file is the only
   moving part: it addresses the board ONLY through data-cc attributes, never
   through a class name, a node id or a position in the tree, and it writes only
   text, custom properties and the two mode attributes the stylesheet reads. It
   creates no layout, moves no box and paints no colour that the stylesheet does
   not already own.

   Talk to Шеф in Russian; everything in here is English except the strings the
   client reads, which are Russian and are the exact wordings from the brief.

   TIME. The scenario below is written in REAL operator seconds - a call really
   is two and a half minutes of an operator's day. The board replays it at demo
   speed: every operator's queue is normalised so that all three finish their
   companies at the same instant, at the end of a 3.5-minute ring. The status
   timer therefore counts the operator's own real seconds (a call runs 00:00 ->
   02:30, which is where the design's 02:31 comes from) off a wall clock that
   never drifts: it is driven by performance.now(), not by a frame counter. The
   clock is accumulated frame by frame, with a quarter-second ceiling on any one
   step, so that a backgrounded tab resumes where it stopped instead of
   fast-forwarding an hour of work in a single frame.

   THE RING IS NOT THE PROJECT. The 3.5-minute ring decides only WHICH company
   each operator is on. The four counters and the money hang off it but are not
   reset by it: they climb, company by company, from where the board opens
   toward the plan, and the only thing that ever returns them to zero is the
   period closing - which the board announces in the feed, in the operator rows
   and in the date range before it happens. Nothing on this board moves
   backwards without saying so first.

   THE EVENT LOG runs on the same compressed clock as the operator timers, not
   on the wall clock in the header: a board that replays a month of work in half
   an hour cannot stamp its event log in real minutes without printing the same
   minute on all five rows. The header clock is the visitor's own time; the feed
   and the recordings carry the board's. The cost of that, stated plainly: the
   log runs AHEAD of the header clock by about one minute for every minute
   watched - three minutes into a look, thirty-nine after forty. The whole of
   the trade is one constant: WORK_RATE 2 -> 1 with PACE_S and CALL_PACE_S
   raised to 62 buys stamps that match the header clock exactly and costs half
   the life in the two bottom panels, a line a minute instead of two.
   ========================================================================== */

(function () {
  'use strict';

  var board = document.getElementById('board');
  if (!board) return;

  /* ---------------------------------------------------------------- helpers */

  function q(sel)  { return board.querySelector(sel); }
  function qa(sel) { return Array.prototype.slice.call(board.querySelectorAll(sel)); }
  function cc(name) { return '[data-cc="' + name + '"]'; }
  function ccN(name, attr, n) { return '[data-cc="' + name + '"][' + attr + '="' + n + '"]'; }

  function pct(a, b) { return b > 0 ? Math.round(a / b * 100) : 0; }
  function money(n)  { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function to100(n)  { return String(Math.round(n / 100) * 100); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function mmss(sec) {
    var s = Math.max(0, Math.floor(sec));
    return pad2((s / 60) | 0) + ':' + pad2(s % 60);
  }

  /* ============================================================ 1. THE MODEL

     Fixed forever: the plan, the paid sum and the tariff. The tariff has no box
     of its own in this frame, so it lives here as the constant it is.
     -------------------------------------------------------------------- */

  var PLAN   = 175;
  var PAID   = 300000;
  var TARIFF = 'Старт';                                    // no node in the frame

  /* Where the board stands when the visitor arrives: three weeks into a thirty
     day period, 120 of the 175 companies processed and 206 000 of the 300 000
     spent. Both are 69 %, which is the design's own accepted frame. From here
     the counters only ever climb. */
  var START = { comp: 120, lpr: 34, inter: 8, offer: 3, used: 206000 };

  /* ------------------------------------------------------------ the funnel
     What a cold outbound project in Armenian B2B really produces, stage by
     stage, each rate a share of the stage above it - so the four counters can
     never break the rule that each is a subset of the one before.

       lpr    ЛПР / обработано        ~29 %   most numbers are silent or die at
                                              the secretary; not three calls in
                                              ten reach the person who decides
       inter  интерес / ЛПР           ~23 %   barely one decision maker in four
                                              who takes a cold call will hear
                                              the offer out
       offer  КП / интерес            ~40 %   the rest are callbacks, not yet
                                              a despatched proposal

     End to end that is 175 companies -> ~51 decision makers -> ~12 interested
     -> ~5 proposals: three in a hundred of a cold list end in a КП. An
     independent audit of the first port of these rates called 28 % interest
     "still the flattering one" and put the honest band at 15-22 %; the base
     came down from 0.280 to 0.230 on that reading.

     The board opened on two thirds and one half - 80 of 120 companies reaching
     the decision maker and 44 of those 80 interested. No cold outbound project
     in Armenian B2B produces that, and it is the first thing a client who has
     run one reads off the screen.

     Every rate carries its own slow swing on its own period, so the board is
     never twice in the same place and the percentages live instead of standing
     still - and because the counters accumulate, what the client reads is a
     running total that drifts by a point or two, not a flicker. */
  var RATE = {
    lpr:   { base: 0.290, amp: 0.040, w: 0.70, ph: 0.00 },   /* 25 .. 33 % */
    inter: { base: 0.230, amp: 0.035, w: 0.43, ph: 1.10 },   /* 20 .. 27 % */
    offer: { base: 0.400, amp: 0.090, w: 0.31, ph: 2.20 }    /* 31 .. 49 % */
  };

  function rateAt(r, loop) { return r.base + r.amp * Math.sin(loop * r.w + r.ph); }

  /* Of the companies that never reach the decision maker, roughly half are
     stopped by a secretary and half never answer at all; the split drifts too. */
  function secShare(loop) { return 0.50 + 0.06 * Math.sin(loop * 0.53 + 0.30); }

  /* A 32-bit LCG. The loop index is the only seed, so the same ring always
     deals the same twenty fates - the board is reproducible, an audit can
     replay it, and nothing here depends on Math.random. */
  function rng(seed) {
    var s = (seed * 1664525 + 1013904223) >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* ------------------------------------------------------------- the money
     A company costs what it costs the operators: a number that rings out
     unanswered five times is cheap, a secretary wall is expensive, a real
     conversation sits in between. So the price of a company is its own length
     in operator seconds against the average one, which is what lets the budget
     run ahead of the plan in one ring and behind it in the next instead of the
     two moving as one bar in two places.

     COST_LEVEL is the project's own rate against the nominal 300 000 / 175, and
     it is below one: the plan is met with budget still on the table, which is
     the result the client is buying. The governor at the end is the only hard
     rule - the used sum can never pass the paid sum and can never fall. */
  var NOMINAL    = PAID / PLAN;                            // 1714.29 драм
  var COST_LEVEL = 0.93;
  var COST_SWING = 0.22;
  var COST_PHASE = 2.30;   /* chosen so the first rings run over the rate and the
                              next ones under it: the money is AHEAD of the plan
                              early and BEHIND it later, which is the thing that
                              cannot happen while both are one number twice */

  /* The design's own bar is 205px wide at 69%. Anchoring the scale there keeps
     the accepted frame pixel-exact at the moment the board opens, instead of
     re-deriving a width that would move the bar before anything has happened. */
  var BAR_PX_AT_69 = 205;

  /* ------------------------------------------------------- the seven statuses
     Seven statuses, seven colours - no two rows can now read as the same state.
     The first port left search and CRM on two greys a step apart, which on a
     1920 board is no difference at all; both are now hues of their own.
     Talking and writing keep the design's own green and orange unchanged.
     `c` goes to the status word, the dot, the activity glyph, the timer and the
     stopwatch; `b` is the operator badge, one step brighter than `c` - the
     relationship the design itself uses (#10D096 over #00A734). */
  var ST = {
    /*                                                                          colour        badge      */
    search: { s: 'Поиск контакта', t: 'Поиск ЛПР',       n: 'Позвонить',       c: '#29a8e0', b: '#5cc0ea', ic: 'search', d: 60  },  /* голубой    */
    dial:   { s: 'Набирает',       t: null,              n: 'Дозвониться',     c: '#10c9b0', b: '#45ddc8', ic: 'dial',   d: 30  },  /* бирюзовый  */
    sec:    { s: 'У секретаря',    t: 'Обход секретаря', n: 'Соединить с ЛПР', c: '#2f7fd0', b: '#5fa0e0', ic: 'sec',    d: 40  },  /* синий      */
    talk:   { s: 'Разговаривает',  t: 'Разговор с ЛПР',  n: 'Выявить интерес', c: '#00a734', b: '#10d096', ic: null,     d: 150 },  /* зелёный    */
    mail:   { s: 'Пишет Email',    t: 'Отправка КП',     n: 'Отправить КП',    c: '#fe9104', b: '#ffa80b', ic: 'mail',   d: 90  },  /* оранжевый  */
    follow: { s: 'Follow Up',      t: 'Отправка КП',     n: 'Позвонить',       c: '#3f57cf', b: '#6f83e0', ic: 'follow', d: 60  },  /* синий      */
    crm:    { s: 'Вносит в CRM',   t: 'Заполняет карту', n: null,              c: '#e0a800', b: '#f5c02a', ic: 'crm',    d: 60  }   /* жёлтый     */
  };

  /* ------------------------------------------------------ the twenty companies
     The names and who calls them are fixed. What happens on the call is not:
     a fate is dealt to every company at the start of each ring, from the rates
     above, by the seeded generator - so the same operator meets the same
     company again on a different day and it goes differently, which is what a
     list of cold numbers actually does. Nothing is random at run time: the ring
     index is the seed, and a given ring always deals the same twenty fates.

     Five fates, and only these five:
       silent  никто не ответил      - five dials, no one picks up
       sec     секретарь не соединил - five dials, a wall every time
       refuse  ЛПР отказал           - the conversation happens and ends in no
       soft    просил перезвонить    - interest, but not yet a proposal
       offer   КП отправлено         - interest and a despatched proposal      */
  var SCEN = [
    { op: 1, name: 'Арарат Мебель'   },
    { op: 1, name: 'Ани Строй'       },
    { op: 1, name: 'Гарни Фуд'       },
    { op: 1, name: 'Ереван Текстиль' },
    { op: 1, name: 'Масис Агро'      },
    { op: 1, name: 'Вардаван Пласт'  },

    { op: 2, name: 'Ширак Металл'    },
    { op: 2, name: 'Зангу Транс'     },
    { op: 2, name: 'Аштарак Бетон'   },
    { op: 2, name: 'Лори Вуд'        },
    { op: 2, name: 'Мегри Фрукт'     },
    { op: 2, name: 'Вернисаж Декор'  },
    { op: 2, name: 'Апаран Молоко'   },

    { op: 3, name: 'Норк Медикал'    },
    { op: 3, name: 'Каскад Отель'    },
    { op: 3, name: 'Севан Логистик'  },
    { op: 3, name: 'Тигран Авто'     },
    { op: 3, name: 'Кентрон Кафе'    },
    { op: 3, name: 'Багратуни Дент'  },
    { op: 3, name: 'Раздан Пекарня'  }
  ];

  /* Fates are dealt by QUOTA, not by a coin toss per company. Twenty companies
     is far too small a sample for a coin: tossing it gave rings where three
     quarters of the interested leads got a proposal and rings where none did,
     and a client reading a percentage does not care that it was honest chance -
     he reads it as the number the project produces. So a hundred companies are
     dealt at once, in the exact proportions the rates ask for, shuffled, and
     handed to the rings twenty at a time. Each ring's own mix still varies,
     because the shuffle does not deal the hundred evenly into five - but the
     hundred is exact, and what the client watches drift is the rates
     themselves, not the sampling error underneath them. */
  var BAG_N = 100;
  var bag = [];

  function quotaBag(n, loop) {
    var nLpr   = Math.round(n * rateAt(RATE.lpr, loop));
    var nInter = Math.round(nLpr * rateAt(RATE.inter, loop));
    var nOffer = Math.round(nInter * rateAt(RATE.offer, loop));
    var nSec   = Math.round((n - nLpr) * secShare(loop));
    return {
      offer:  nOffer,
      soft:   nInter - nOffer,
      refuse: nLpr - nInter,
      sec:    nSec,
      silent: n - nLpr - nSec
    };
  }

  /* Not a shuffle - a spread. A plain shuffle of a hundred puts four silent
     numbers back to back and then three conversations back to back, and the
     recordings table goes eighty seconds without a line and then takes three
     at once. Each fate is laid down at even spacing across the hundred instead,
     with a small deterministic offset per fate so the five never fall into a
     repeating pattern: the mix of any twenty is close to the mix of the
     hundred, and no row ever shows the same outcome three times running. */
  function spread(groups, r) {
    var slots = [], k, i, n, off;
    for (k in groups) if (groups.hasOwnProperty(k)) {
      n = groups[k]; if (!n) continue;
      off = r() * 0.6 - 0.3;
      for (i = 0; i < n; i++) slots.push({ f: k, at: (i + 0.5 + off) / n });
    }
    slots.sort(function (a, b) { return a.at - b.at; });
    return slots.map(function (s) { return s.f; });
  }

  function fatesForCycle(loop) {
    if (bag.length < SCEN.length) {
      bag = bag.concat(spread(quotaBag(BAG_N, loop), rng(loop * 7919 + 104729)));
    }
    return bag.splice(0, SCEN.length);
  }

  /* ------------------------------------------------------------ the feed icons
     One glyph per event type, cut in the weight of the five already in the
     frame: solid, 24-grid, no stroke, so nothing depends on a stroke width
     surviving the board's scale transform. */
  var IC = {
    /* --- operator activity column --- */
    search: '<path d="M10.5 3a7.5 7.5 0 0 1 5.92 12.13l4.73 4.72-1.3 1.3-4.73-4.72A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"/>',
    dial:   '<path d="M6.62 10.79a15.1 15.1 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1A17 17 0 0 1 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z"/><path d="M17.5 2.2 22 6.7l-4.5 4.5V8.2h-4.3V5.2h4.3V2.2Z"/>',
    sec:    '<path d="M12 2a9 9 0 0 0-9 9v6a3 3 0 0 0 3 3h2a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H5v-1a7 7 0 1 1 14 0v1h-3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2a3 3 0 0 0 3-3v-6a9 9 0 0 0-9-9Z"/>',
    mail:   '<path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1.9 2L12 12.1 19.1 7H4.9ZM4 8.6V17h16V8.6l-7.4 5.3a1 1 0 0 1-1.2 0L4 8.6Z"/>',
    follow: '<path d="M12 5V2L7.5 6.5 12 11V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8Z"/>',
    crm:    '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v12h16V6H4Zm2 2h6v2H6V8Zm0 3.5h6v2H6v-2ZM6 15h12v2H6v-2Zm8-7h4v5.5h-4V8Z"/>',

    /* --- Bitrix24 feed --- */
    noanswer: '<path d="M6.62 10.79a15.1 15.1 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1A17 17 0 0 1 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z"/><path d="M21.4 2.2 22.8 3.6l-2.1 2.1 2.1 2.1-1.4 1.4-2.1-2.1-2.1 2.1-1.4-1.4 2.1-2.1-2.1-2.1 1.4-1.4 2.1 2.1 2.1-2.1Z"/>',
    secblock: '<path d="M12 3.5a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Zm0 9.1c3.9 0 7.1 1.9 7.1 4.2V20H4.9v-3.2c0-2.3 3.2-4.2 7.1-4.2Z"/><path d="M3.5 1.9 22.1 20.5l-1.6 1.6L1.9 3.5l1.6-1.6Z"/>',
    retry:    '<path d="M12 5V2L7.5 6.5 12 11V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8Z"/>',
    letter:   '<path d="M2 21V13l9-1-9-1V3l20 9-20 9Z"/>',
    lpr:      '<path d="M9.5 3.5a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4Zm0 9.1c1 0 1.9.1 2.8.3a7 7 0 0 0 1.3 7.1H2.5v-3.2c0-2.3 3.2-4.2 7-4.2Z"/><path d="m17.9 20.6-3.9-3.9 1.5-1.5 2.4 2.4 4.2-4.2 1.5 1.5-5.7 5.7Z"/>',
    refuse:   '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm3.5 3.1L12 10.6 8.5 7.1 7.1 8.5l3.5 3.5-3.5 3.5 1.4 1.4 3.5-3.5 3.5 3.5 1.4-1.4-3.5-3.5 3.5-3.5-1.4-1.4Z"/>',
    callback: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 3v6l5.2 3.1 1-1.7-4.2-2.5V7h-2Z"/>',
    deal:     '<path d="M9 3h6a2 2 0 0 1 2 2v2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3V5a2 2 0 0 1 2-2Zm0 4h6V5H9v2ZM4 9v9h16V9H4Z"/>',
    kp:       '<path d="M6 2h8l6 6v5h-2V9h-5V4H6v16h6v2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm12 12 4.5 4.5L18 23v-3.5h-5v-2h5V14Z"/>'
  };

  /* the wave is the design's own twelve bars, captured from row 1 at start-up
     and reused on any row that starts a call; nothing about it is redrawn */
  var WAVE = '';

  /* ==================================================== 2. THE TWENTY QUEUES

     A company is a list of steps. Each step carries everything the row shows,
     so a repaint is one assignment per field and can never mix two statuses.
     Events are attached to the step they are true at the end of, which is why
     «Письмо ЛПР отправлено» rides the mail step and not the fifth dial.
     -------------------------------------------------------------------- */

  function buildSteps(name, fate) {
    var out = [], a;

    function add(kind, opt) {
      opt = opt || {};
      var st = ST[kind];
      out.push({
        kind:   kind,
        client: name,
        task:   opt.task !== undefined ? opt.task : st.t,
        next:   opt.next !== undefined ? opt.next : st.n,
        dur:    st.d,
        call:   !!opt.call,
        events: opt.events || null,
        close:  opt.close || null
      });
      return out[out.length - 1];
    }

    /* ONE line per step, never a bundle. Two things were wrong with the bundle.
       The first port put a line on every one of the five dials, so one company
       shouted eleven times into a five-row feed while nineteen others were
       silent. And the lines a company did produce all arrived in the same
       instant - «Выход на ЛПР» and «Контакт закрыт: отказ» together - so the
       mixer, which can only emit one at a time, kept the newer and the green
       line that the client actually came to see was never once shown. Each
       line now rides the step it is true at the end of, and they are minutes of
       operator time apart: the decision maker is reached when the conversation
       ends, the deal is created while the card is being filled, the proposal
       goes out with the letter. */
    if (fate === 'sec' || fate === 'silent') {
      var miss = fate === 'sec' ? 'Секретарь не соединил' : 'Никто не ответил';
      add('search');
      for (a = 1; a <= 5; a++) {
        add('dial', { task: 'Дозвон, ' + a + ' из 5' });
        if (fate === 'sec') add('sec');
      }
      out[out.length - 1].events = [miss];        /* the fifth attempt reports */
      add('crm', { next: 'Письмо ЛПР' });
      add('mail', {
        events: ['Письмо ЛПР отправлено'],
        close:  { talked: false, interested: false, offered: false }
      });
      return close(out);
    }

    add('search');
    add('dial', { task: 'Дозвон, 1 из 5' });
    /* the recording is cut and the decision maker is booked here, at the end of
       the conversation itself - not when the card is finally closed */
    add('talk', { call: true, events: ['Выход на ЛПР'] });

    if (fate === 'refuse') {
      add('crm', {
        next:   'Закрыть контакт',
        events: ['Контакт закрыт: отказ'],
        close:  { talked: true, interested: false, offered: false }
      });
    } else if (fate === 'soft') {
      add('crm', { next: 'Перезвонить' });
      add('follow', {
        events: ['Задача: перезвонить'],
        close:  { talked: true, interested: true, offered: false }
      });
    } else {                                                    /* offer */
      add('crm', { next: 'Письмо ЛПР', events: ['Создана сделка'] });
      add('mail', {
        events: ['Отправлено КП'],
        close:  { talked: true, interested: true, offered: true }
      });
    }
    return close(out);

    /* what the company cost the three of them, carried on the closing step so
       the money can be charged from the work and not from a flat slice */
    function close(list) {
      var dur = 0, i;
      for (i = 0; i < list.length; i++) dur += list[i].dur;
      for (i = 0; i < list.length; i++) if (list[i].close) list[i].close.dur = dur;
      return list;
    }
  }

  /* The average company, weighted by the base rates - the yardstick every
     company's own length is priced against. */
  var AVG_DUR = (function () {
    var pl = RATE.lpr.base, pi = RATE.inter.base, po = RATE.offer.base;
    var w = {
      silent: (1 - pl) * 0.5,
      sec:    (1 - pl) * 0.5,
      refuse: pl * (1 - pi),
      soft:   pl * pi * (1 - po),
      offer:  pl * pi * po
    };
    var sum = 0, k;
    for (k in w) if (w.hasOwnProperty(k)) sum += w[k] * fateDur(k);
    return sum;

    function fateDur(fate) {
      var list = buildSteps('', fate), d = 0, i;
      for (i = 0; i < list.length; i++) d += list[i].dur;
      return d;
    }
  })();

  /* ------------------------------------------------------ the feed event map
     Every event type carries its own glyph AND its own colour, so the feed is
     read by colour before it is read by word. The five colours are the ones
     asked for: grey closes a contact, orange is a letter or a despatch, green
     is a result on the decision maker, blue is a dial, violet is a task booked
     for later. Where two types share a rule they take two tones of it, so no
     five rows can ever show one colour twice by accident.

     `result` marks the lines the client came to see. They are never dropped by
     the mixer, and - because only operators 01 and 03 ever produce one - they
     are what the mixer's own operator rule guarantees inside every five rows. */
  var EV = {
    retry:    { ic: 'retry',    c: '#2f7fd0', result: false },  /* попытка дозвона   — синий      */
    noanswer: { ic: 'noanswer', c: '#29a8e0', result: false },  /* никто не ответил  — голубой    */
    secblock: { ic: 'secblock', c: '#e0a800', result: false },  /* секретарь         — жёлтый     */
    letter:   { ic: 'letter',   c: '#fea700', result: false },  /* письмо ЛПР        — оранжевый  */
    lpr:      { ic: 'lpr',      c: '#00a734', result: true  },  /* выход на ЛПР      — зелёный    */
    deal:     { ic: 'deal',     c: '#10c060', result: true  },  /* создана сделка    — зелёный    */
    kp:       { ic: 'kp',       c: '#f2760a', result: true  },  /* отправлено КП     — оранжевый  */
    refuse:   { ic: 'refuse',   c: '#93a1af', result: true  },  /* контакт закрыт    — серый      */
    callback: { ic: 'callback', c: '#7b5ad0', result: true  }   /* задача перезвонить— фиолетовый */
  };

  function eventKind(text) {
    if (text.indexOf('Попытка') === 0)     return 'retry';
    if (text.indexOf('План выполнен') === 0) return 'deal';      /* период закрыт  */
    if (text.indexOf('Период закрыт') === 0) return 'kp';        /* отчёт клиенту  */
    if (text.indexOf('Новый период') === 0)  return 'callback';  /* открыт заново  */
    if (text === 'Никто не ответил')       return 'noanswer';
    if (text === 'Секретарь не соединил')  return 'secblock';
    if (text === 'Письмо ЛПР отправлено')  return 'letter';
    if (text === 'Выход на ЛПР')           return 'lpr';
    if (text === 'Контакт закрыт: отказ')  return 'refuse';
    if (text === 'Задача: перезвонить')    return 'callback';
    if (text === 'Создана сделка')         return 'deal';
    return 'kp';                                       /* Отправлено КП */
  }

  /* --------------------------------------------------------- the three rings
     One ring per operator. Its own speed is chosen so that the ring takes
     exactly the active part of the loop, whatever its real length: an operator
     dealt seven walls this ring has thirty-five dials to get through and simply
     works faster on screen than one dealt four conversations. Over one loop
     each ring turns exactly once, so all twenty companies close - twenty every
     ring, whatever the fates - and the counters advance by exactly twenty
     processed companies, never by a nudge at the end.

     What the ring does NOT do any more is decide the numbers. It decides which
     company is on screen; the counters live above it and accumulate. */

  var CYCLE_ACTIVE = 195;                              /* seconds of wall clock */
  var CYCLE_PAUSE  = 15;                               /* only the timers move  */
  var CYCLE        = CYCLE_ACTIVE + CYCLE_PAUSE;       /* 3.5 minutes           */

  /* deterministic, non-harmonic starting points, so the three rows never step
     together; the loop index rotates them, so no two loops look alike */
  var PHASE = [0.00, 0.41, 0.73];
  var PHASE_ROTATE = 0.137;

  var ops = [1, 2, 3].map(function (n) {
    return { n: n, steps: [], cum: [], total: 0, speed: 1, off: 0, done: 0, painted: -1 };
  });

  /* Deal the ring its twenty fates and rebuild the three queues from them. */
  function buildCycle(loop) {
    var fates = fatesForCycle(loop);
    ops.forEach(function (op) { op.steps = []; op.cum = []; op.total = 0; });
    SCEN.forEach(function (co, i) {
      var op = ops[co.op - 1];
      buildSteps(co.name, fates[i]).forEach(function (s) { op.steps.push(s); });
    });
    ops.forEach(function (op) {
      var sum = 0;
      op.steps.forEach(function (s) { sum += s.dur; op.cum.push(sum); });
      op.total = sum;
      op.speed = sum / CYCLE_ACTIVE;   /* real operator seconds per wall second */
    });
  }

  function endAt(op, k) {
    return Math.floor(k / op.steps.length) * op.total + op.cum[k % op.steps.length];
  }

  /* =========================================================== 3. THE ELEMENTS
     Everything the engine touches, resolved once, only through data-cc.
     -------------------------------------------------------------------- */

  var el = {
    clock:   q(cc('clock')),
    weekday: q(cc('weekday')),
    date:    q(cc('date')),
    range:   q(cc('range')),
    used:    q(cc('used')),
    barFill: q(cc('bar-fill')),
    barPct:  q(cc('bar-pct')),
    priceL:  q('[data-cc="price"][data-cc-p="lpr"]'),
    priceI:  q('[data-cc="price"][data-cc-p="int"]'),
    lamps:   qa(cc('lamp')),
    kNum:    [1, 2, 3, 4].map(function (i) { return q(ccN('kpi-num', 'data-cc-k', i)); }),
    kPct:    [1, 2, 3, 4].map(function (i) { return q(ccN('kpi-pct', 'data-cc-k', i)); }),
    rows:    [1, 2, 3].map(function (i) {
      return {
        badge:  q(ccN('badge',  'data-cc-op', i)),
        dot:    q(ccN('dot',    'data-cc-op', i)),
        status: q(ccN('status', 'data-cc-op', i)),
        task:   q(ccN('task',   'data-cc-op', i)),
        client: q(ccN('client', 'data-cc-op', i)),
        next:   q(ccN('next',   'data-cc-op', i)),
        time:   q(ccN('time',   'data-cc-op', i)),
        timer:  q(ccN('timer',  'data-cc-op', i)),
        act:    q(ccN('act',    'data-cc-op', i))
      };
    }),
    bx: [1, 2, 3, 4, 5].map(function (i) {
      return {
        row:  q(ccN('bx-row',  'data-cc-bx', i)),
        time: q(ccN('bx-time', 'data-cc-bx', i)),
        ic:   q(ccN('bx-ic',   'data-cc-bx', i)),
        text: q(ccN('bx-text', 'data-cc-bx', i))
      };
    }),
    lc: [1, 2, 3, 4, 5].map(function (i) {
      return {
        row:     q(ccN('lc-row',     'data-cc-lc', i)),
        time:    q(ccN('lc-time',    'data-cc-lc', i)),
        company: q(ccN('lc-company', 'data-cc-lc', i))
      };
    })
  };

  /* ================================================================ 4. CLOCK
     Real time in Yerevan, GMT+4, read from the machine's own clock through the
     IANA zone rather than by adding four hours to UTC.
     -------------------------------------------------------------------- */

  var MON_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var MON_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн',
                   'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  var WEEKDAY = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда',
                 'Четверг', 'Пятница', 'Суббота'];

  var ZONE = 'Asia/Yerevan';
  var partsFmt;
  try {
    partsFmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: ZONE, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short'
    });
  } catch (e) { partsFmt = null; }

  var WD_EN = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function yerevan(d) {
    if (!partsFmt) {                       /* no Intl: fall back to fixed +4 */
      var u = new Date(d.getTime() + 4 * 3600000);
      return { y: u.getUTCFullYear(), m: u.getUTCMonth() + 1, d: u.getUTCDate(),
               h: u.getUTCHours(), mi: u.getUTCMinutes(), s: u.getUTCSeconds(),
               w: u.getUTCDay() };
    }
    var p = {}, i, list = partsFmt.formatToParts(d);
    for (i = 0; i < list.length; i++) p[list[i].type] = list[i].value;
    return {
      y: +p.year, m: +p.month, d: +p.day,
      h: +p.hour % 24, mi: +p.minute, s: +p.second,
      w: WD_EN[p.weekday] === undefined ? 0 : WD_EN[p.weekday]
    };
  }

  function shiftDays(t, days) {
    var base = Date.UTC(t.y, t.m - 1, t.d) + days * 86400000;
    var u = new Date(base);
    return { y: u.getUTCFullYear(), m: u.getUTCMonth() + 1, d: u.getUTCDate() };
  }

  var lastClock = '', lastDay = '';

  /* Days the reporting window has moved since the board opened: thirty for
     every period that has closed under the visitor's eyes. The clock, the
     weekday and the date stay the machine's own real Yerevan time - only the
     period's own window travels. */
  var periodShift = 0;

  /* Seconds of board time since the engine started, and the rate the event log
     runs at against them. Two board seconds to the wall second is the smallest
     compression that still puts a different minute on every feed row; anything
     slower and all five rows print one minute, which is the thing the client
     noticed. */
  var simT = 0;
  var WORK_RATE = 2;

  function paintClock() {
    var t = yerevan(new Date());
    var hhmmss = pad2(t.h) + ':' + pad2(t.mi) + ':' + pad2(t.s);
    if (hhmmss !== lastClock) { lastClock = hhmmss; el.clock.textContent = hhmmss; }

    var key = t.y + '-' + t.m + '-' + t.d;
    if (key === lastDay) return;
    lastDay = key;

    /* the design's own double space between the country and the offset */
    el.weekday.textContent = WEEKDAY[t.w] + ' (Армения  GMT+4)';
    el.date.textContent    = t.d + ' ' + MON_GEN[t.m - 1] + ' ' + t.y;

    var a = shiftDays(t, -20 + periodShift), b = shiftDays(t, 10 + periodShift);
    el.range.textContent = a.d + ' ' + MON_SHORT[a.m - 1] + ' — ' +
                           b.d + ' ' + MON_SHORT[b.m - 1] + ' ' + b.y;
  }

  function hhmmBack(minutes) {
    var t = yerevan(new Date(Date.now() - minutes * 60000));
    return pad2(t.h) + ':' + pad2(t.mi);
  }

  /* The stamp the feed and the recordings carry: the board's own compressed
     clock, frozen into the row at the moment it is written and never rewritten
     afterwards, so a line that has arrived never changes its time again. */
  function hhmmWork() {
    var t = yerevan(new Date(Date.now() + simT * (WORK_RATE - 1) * 1000));
    return pad2(t.h) + ':' + pad2(t.mi);
  }

  /* ============================================================== 5. PAINTING
     -------------------------------------------------------------------- */

  var still = false;                       /* freeze-frame mode, decided below */

  function flash(node, cls) {
    if (!node || still) return;
    node.classList.remove(cls);
    void node.offsetWidth;                 /* restart the animation */
    node.classList.add(cls);
  }

  var state = { comp: START.comp, lpr: START.lpr, inter: START.inter,
                offer: START.offer, used: START.used };

  /* A price needs something to divide by. In the first seconds of a fresh
     period there is no decision maker yet, and a board that answers that with
     a 0 is telling the client a lie about a number he is paying for. In the
     shipped model this branch is unreachable - a period opens on forty-two
     companies already worked - and it is kept as the guard it is. */
  function price(sum, n) { return n > 0 ? to100(sum / n) : '—'; }

  /* THE TWO PRICE CHIPS WERE DRAWN FOR A FOUR-FIGURE NUMBER. The design's own
     values are 2600 and 4700, and the box holds them with nine pixels of chip
     to spare. An honest funnel makes the price of an interested lead a
     five-figure one - about 22 000 драм - and five figures at the design's own
     width are 45.75px where 36.59 are free between the dram sign and the right
     margin: the number ends 0.25px short of the chip's edge, flush against a
     border the design gives it nine pixels of air from. An independent audit
     read the magnified crop as a digit painted outside the chip.

     It is set on the FONT'S OWN WIDTH AXIS instead - the same face, size,
     weight and baseline, narrower glyphs - which is the mechanism the design
     file itself declares on these nodes (`font-variation-settings: 'wdth' 100`).
     Four figures and under are not touched at all, so the accepted rendering of
     2600 and 4700 is byte-identical to the frame; only a number the design has
     no room for is narrowed, and only as far as it must be. */
  function setPrice(node, text) {
    node.textContent = text;
    var n = text.length;
    node.style.fontVariationSettings = n <= 4 ? '' : (n === 5 ? "'wdth' 80" : "'wdth' 75");
  }

  /* The whole numeric board in one call, so a number and its percentage can
     never be one tick apart: both are written before the frame is handed back
     to the browser. Both price rows are divisions of the used sum, rounded to
     the nearest hundred - which is exactly where the design's 2600 and 4700
     come from, and why neither is ever written as a literal. */
  function paintNumbers(highlight) {
    el.kNum[0].textContent = state.comp;
    el.kPct[0].textContent = pct(state.comp, PLAN) + '%';
    el.kNum[1].textContent = state.lpr;
    el.kPct[1].textContent = pct(state.lpr, state.comp) + '%';
    el.kNum[2].textContent = state.inter;
    el.kPct[2].textContent = pct(state.inter, state.lpr) + '%';
    el.kNum[3].textContent = state.offer;
    el.kPct[3].textContent = pct(state.offer, state.inter) + '%';

    el.used.textContent   = money(state.used);
    setPrice(el.priceL, price(state.used, state.lpr));
    setPrice(el.priceI, price(state.used, state.inter));

    var bar = pct(state.used, PAID);
    el.barPct.textContent   = bar + '%';
    el.barFill.style.width  = (BAR_PX_AT_69 * bar / 69).toFixed(2) + 'px';

    if (!highlight) return;
    el.kNum.forEach(function (n) { flash(n, 'cc-bump'); });
    el.kPct.forEach(function (n) { flash(n, 'cc-bump'); });
    [el.used, el.priceL, el.priceI, el.barPct].forEach(function (n) { flash(n, 'cc-bump'); });
    el.lamps.forEach(function (n) { flash(n, 'cc-flare'); });
  }

  /* The activity cell. A call gets the design's own waveform, alive; every
     other status gets its glyph in the status colour, centred on the same slot
     and needing no coordinates of its own. */
  function paintAct(node, st) {
    if (st.ic === null) {
      if (node.getAttribute('data-cc-mode') === 'wave') return;
      node.removeAttribute('data-cc-icon');
      node.setAttribute('data-cc-mode', 'wave');
      node.innerHTML = WAVE;
      return;
    }
    if (node.getAttribute('data-cc-icon') === st.ic) return;
    node.setAttribute('data-cc-mode', 'icon');
    node.setAttribute('data-cc-icon', st.ic);
    node.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" ' +
                     'focusable="false" xmlns="http://www.w3.org/2000/svg">' + IC[st.ic] + '</svg>';
  }

  /* One row, whole, in one frame: status, task, client, next step, dot, badge,
     timer ink and glyph are all written before the browser gets the frame back,
     so no half-changed combination is ever painted. */
  function paintRow(i, step) {
    var r = el.rows[i], st = ST[step.kind];
    r.status.textContent = st.s;
    r.task.textContent   = step.task;
    r.client.textContent = step.client;
    r.next.textContent   = step.next;
    r.dot.style.setProperty('--cc-c', st.c);
    r.status.style.setProperty('--cc-c', st.c);
    r.time.style.setProperty('--cc-c', st.c);
    r.timer.style.setProperty('--cc-c', st.c);
    r.act.style.setProperty('--cc-c', st.c);
    r.badge.style.setProperty('--cc-cb', st.b);
    paintAct(r.act, st);
  }

  /* ------------------------------------------------------------- Bitrix24 feed
     Five rows, five entries, rewritten from the array every time - so the fifth
     falls off and the top one arrives already carrying its text and its glyph.
     Only the new row fades; the four below it are a shift, not an arrival. */
  var feed = [];

  function paintFeed(fadeTop) {
    for (var i = 0; i < 5; i++) {
      var e = feed[i], f = el.bx[i];
      if (!e) continue;
      f.time.textContent = e.time;
      f.text.textContent = e.text;
      f.ic.style.setProperty('--cc-ic', EV[e.kind].c);
      f.ic.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" ' +
                       'focusable="false" xmlns="http://www.w3.org/2000/svg">' +
                       IC[EV[e.kind].ic] + '</svg>';
    }
    if (!fadeTop) return;
    flash(el.bx[0].time, 'cc-in');
    flash(el.bx[0].text, 'cc-in');
    flash(el.bx[0].ic,   'cc-in');
  }

  function pushFeed(text, time) {
    feed.unshift({ text: text, time: time || hhmmWork(), kind: eventKind(text) });
    feed.length = 5;
    paintFeed(true);
  }

  /* --------------------------------------------------------------- last calls
     Only companies where a conversation with the decision maker really took
     place reach this table - about six of every twenty, and the recording is
     written at the moment the conversation ends, not when the card is finally
     closed, so it stands a minute or two AHEAD of that company's own line in
     the feed, which is the order the two things really happen in. Time and
     name, nothing else; the waveform and the download disc stay as the
     design's furniture. */
  var calls = [];

  function paintCalls(fadeTop) {
    for (var i = 0; i < 5; i++) {
      var c = calls[i];
      if (!c) continue;
      el.lc[i].time.textContent    = c.time;
      el.lc[i].company.textContent = c.name;
    }
    if (!fadeTop) return;
    flash(el.lc[0].time, 'cc-in');
    flash(el.lc[0].company, 'cc-in');
  }

  /* The twenty companies come round again every ring, so without this a company
     called twice inside three minutes stood twice in a five-row table of «last
     calls» - which reads as a bug, not as a second conversation. The table
     carries the LAST call per company: a repeat moves the company to the top
     with its new time instead of adding a second row, and five distinct
     companies are always on screen. */
  function pushCall(name, time) {
    for (var i = 0; i < calls.length; i++) {
      if (calls[i].name === name) { calls.splice(i, 1); break; }
    }
    calls.unshift({ name: name, time: time || hhmmWork() });
    calls.length = 5;
    paintCalls(true);
  }

  /* Recordings are paced exactly like the feed and for exactly the same reason.
     Three operators finish three conversations inside the same few seconds far
     more often than chance suggests - the ring closes all three queues together
     - and the table then stood with three rows carrying one minute. They wait
     their turn instead. The queue holds three: what this table is for is the
     LAST calls, so a recording that has been waiting through two others is not
     worth showing at all. */
  var callQ = [], lastCallT = -1e9, callsOut = 0;
  var CALL_PACE_S = 31;

  function callPaceS() { return CALL_PACE_S + (callsOut * 5) % 8; }   /* 31 .. 38 */

  function queueCall(name) {
    callQ.push(name);
    while (callQ.length > 3) callQ.shift();
  }

  function drainCall(time) {
    if (!callQ.length) return false;
    callsOut++;
    pushCall(callQ.shift(), time);
    return true;
  }

  /* ============================================================== 6. THE NOTICE
     The four links and the record controls answer with one line and no audio.
     -------------------------------------------------------------------- */

  var NOTICE = 'Материалы доступны в личном кабинете клиента';
  var noticeEl = null, noticeTimer = 0;

  function showNotice(target) {
    if (!noticeEl) {
      noticeEl = document.createElement('div');
      noticeEl.className = 'cc-notice';
      noticeEl.setAttribute('role', 'status');
      noticeEl.textContent = NOTICE;
      board.appendChild(noticeEl);
    }
    var br = board.getBoundingClientRect();
    var scale = br.width / 1920 || 1;
    var tr = target.getBoundingClientRect();
    var cx = (tr.left + tr.width / 2 - br.left) / scale;
    var ty = (tr.top - br.top) / scale;
    var th = tr.height / scale;

    noticeEl.style.left = '0px';
    noticeEl.style.top  = '0px';
    var w = noticeEl.offsetWidth, h = noticeEl.offsetHeight;
    var x = Math.max(16, Math.min(1920 - w - 16, cx - w / 2));
    var y = ty - h - 10;
    if (y < 16) y = ty + th + 10;

    noticeEl.style.left = x + 'px';
    noticeEl.style.top  = y + 'px';
    noticeEl.classList.add('cc-on');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () { noticeEl.classList.remove('cc-on'); }, 2600);
  }

  qa(cc('notice')).forEach(function (node) {
    node.addEventListener('click', function (ev) { ev.preventDefault(); showNotice(node); });
  });

  /* ============================================================ 7. START-UP
     -------------------------------------------------------------------- */

  /* the waveform, taken from the row that already carries it; the per-path ids
     are dropped so three rows can show it at once without colliding */
  (function captureWave() {
    var src = el.rows[0].act;
    WAVE = src.innerHTML.replace(/\sid="[^"]*"/g, '');
  })();

  /* The feed's icon slot: one 22x22 box per row, centred on the recessed plate
     the design draws under it, so nine glyphs can share five rows and each one
     is big enough to tell apart.

     The design stacks TWO 30x30 plates per row, at x 484.609 and 485.796 and at
     y rowTop+6; the second paints over the first, so what the eye sees is the
     union, 31.187 wide by 30 high, centred on (500.203, rowTop+21). The icon is
     centred on that: 4.59px of air left and right, 4px top and bottom. Left and
     right match each other, top and bottom match each other, and the 0.59px
     between the two pairs is the plate's own 31.187-by-30 shape, not a nudge -
     a square glyph cannot sit with four equal margins inside a box that is not
     square, and the plates are not being moved. */
  el.bx.forEach(function (f) {
    var top = parseFloat(f.row.style.top) || 0;
    f.ic.style.left   = '489.2px';                 /* 500.203 - 22/2, rounded to the design's own precision */
    f.ic.style.top    = (top + 10) + 'px';         /* rowTop + 6 + (30 - 22)/2 */
    f.ic.style.width  = '22px';
    f.ic.style.height = '22px';
  });

  /* row four's inline arrow belonged to «Изменение статуса: P2 → P3», which is
     not one of this feed's event types; it has nothing left to point at */
  var arrow = q(cc('bx-arrow'));
  if (arrow) arrow.style.display = 'none';

  /* ---------------------------------------------------- real glass in the well
     Variant A, "cast glass over a lamp", glass at full thickness. Built here
     rather than written into the markup so index.html keeps carrying nothing
     but the frozen frame and one script tag.

     Every measurement is derived from the element's own layout box, so the
     94x44 KPI wells and the 66x28 price chips get the same glass at their own
     scale and neither is stretched: the viewBox is 1:1 with the box, so the
     bevel and the specular highlight stay round.

     The ids are suffixed per well. Six wells sharing one filter id would share
     one filter region, and the two chip-sized ones would be cut off by the
     bigger one's box. */
  function buildGlass(node, i) {
    var w = node.offsetWidth  || 94;
    var h = node.offsetHeight || 44;
    var id = 'ccg' + i;
    var r  = 8;                       /* the design's own corner on both wells  */
    var wall = Math.max(2, h * 0.058);/* оправа: the wall of the frame          */
    var T = h * 0.075;                /* glass thickness, at the top of its range */
    var S = h * 0.26;                 /* how far the bevel stands up            */
    var x = wall, y = wall, iw = w - wall * 2, ih = h - wall * 2, ir = Math.max(2, r - wall * 0.75);
    var n = function (v) { return (Math.round(v * 100) / 100); };

    node.innerHTML =
      '<svg viewBox="0 0 ' + n(w) + ' ' + n(h) + '" xmlns="http://www.w3.org/2000/svg" ' +
        'aria-hidden="true" focusable="false">' +
      '<defs>' +
        /* оправа — тёмная стенка */
        '<linearGradient id="' + id + 'f" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#4a525b"/>' +
          '<stop offset="0.5" stop-color="#262b31"/>' +
          '<stop offset="1" stop-color="#13161a"/>' +
        '</linearGradient>' +
        /* лампа в глубине шахты — снизу вверх, белая в центре, гаснет к верху */
        '<radialGradient id="' + id + 'l" cx="0.5" cy="0.9" r="0.86">' +
          '<stop offset="0"    stop-color="#ffffff" stop-opacity="1"/>' +
          '<stop offset="0.28" stop-color="#fff4d9" stop-opacity="0.88"/>' +
          '<stop offset="0.62" stop-color="#9fc4e6" stop-opacity="0.34"/>' +
          '<stop offset="1"    stop-color="#6f93b8" stop-opacity="0"/>' +
        '</radialGradient>' +
        /* стеклянная пластина — сверху вниз, почти белая к голубоватому */
        '<linearGradient id="' + id + 'p" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0"    stop-color="#ffffff" stop-opacity="0.5"/>' +
          '<stop offset="0.45" stop-color="#dce9f6" stop-opacity="0.28"/>' +
          '<stop offset="1"    stop-color="#9dbcd8" stop-opacity="0.24"/>' +
        '</linearGradient>' +
        /* объём: размытие альфы, точечный свет сверху-слева, сложение с оригиналом */
        '<filter id="' + id + 'v" x="-40%" y="-40%" width="180%" height="180%" ' +
          'color-interpolation-filters="sRGB">' +
          '<feGaussianBlur in="SourceAlpha" stdDeviation="' + n(T) + '" result="blur"/>' +
          '<feSpecularLighting in="blur" surfaceScale="' + n(S) + '" specularConstant="0.95" ' +
            'specularExponent="30" lighting-color="#ffffff" result="spec">' +
            '<fePointLight x="' + n(w * 0.16) + '" y="' + n(-h * 0.42) + '" z="' + n(h * 1.05) + '"/>' +
          '</feSpecularLighting>' +
          '<feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>' +
          '<feComposite in="SourceGraphic" in2="specIn" operator="arithmetic" ' +
            'k1="0" k2="1" k3="1" k4="0"/>' +
        '</filter>' +
      '</defs>' +

      /* оправа и её кант */
      '<rect x="0" y="0" width="' + n(w) + '" height="' + n(h) + '" rx="' + r +
        '" fill="url(#' + id + 'f)"/>' +
      '<rect x="0.5" y="0.5" width="' + n(w - 1) + '" height="' + n(h - 1) + '" rx="' + n(r - 0.5) +
        '" fill="none" stroke="#828f9b" stroke-opacity="0.5" stroke-width="1"/>' +

      /* шахта */
      '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(iw) + '" height="' + n(ih) +
        '" rx="' + n(ir) + '" fill="#080a0d"/>' +

      /* лампа — единственное, что здесь дышит и вспыхивает */
      '<g class="cc-lamp-core">' +
        '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(iw) + '" height="' + n(ih) +
          '" rx="' + n(ir) + '" fill="url(#' + id + 'l)"/>' +
      '</g>' +

      /* стекло с объёмом */
      '<g filter="url(#' + id + 'v)">' +
        '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(iw) + '" height="' + n(ih) +
          '" rx="' + n(ir) + '" fill="url(#' + id + 'p)"/>' +
      '</g>' +

      /* блик по кромке стекла */
      '<rect x="' + n(x + 0.45) + '" y="' + n(y + 0.45) + '" width="' + n(iw - 0.9) +
        '" height="' + n(ih - 0.9) + '" rx="' + n(ir - 0.45) +
        '" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="0.9"/>' +
      '</svg>';
  }

  /* each well breathes on its own phase - six wells breathing together would
     read as fairy lights, not as six separate lamps

     Dark theme only: in light the six wells keep Шеф's own accepted look, the
     neumorphic well already painted by their own CSS (.kpi-value, .cost-chip),
     and the engine never touches their markup - nothing is built to hide, and
     nothing of theirs is destroyed. The toggle only ever sets one attribute on
     <html>, so a MutationObserver on it is what makes a runtime flip build or
     clear the glass without a reload. */
  function syncGlass() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    el.lamps.forEach(function (node, i) {
      var hasGlass = !!node.querySelector('svg');
      if (dark && !hasGlass) {
        buildGlass(node, i);
        node.style.setProperty('--cc-ph', (-i * 0.97).toFixed(2) + 's');
      } else if (!dark && hasGlass) {
        node.innerHTML = '';
      }
    });
  }
  syncGlass();
  new MutationObserver(syncGlass).observe(document.documentElement,
    { attributes: true, attributeFilter: ['data-theme'] });

  /* --------------------------------------------- dark glass on the three plates
     The same construction as the wells above and the same order of filter
     operations, turned over: up there the digit is dark on lit glass, here the
     glyph on the plate is the light thing, so the plate is dark and the lamp is
     barely on. No outward glow.

     THE PLATES ONLY - the row around them is not touched. Three of them:
       .bx-plate      30x30, r 8   - under the feed glyph (the design lays two
                                     of them per row, 1.187px apart; both get
                                     the glass, the top one covers the other)
       .lc-play-face  27x27, round - the play disc
       .lc-dl         30x30, r 8   - the download square
     Each keeps its own size and its own radius, read off the element, so not a
     pixel of shape moves. The glass goes in as the plate's FIRST child; the
     glyph, the download arrow and the play arrow are later siblings of the
     plate, never children, so all three stay on top untouched. */
  function buildPlateGlass(node, id) {
    var w = node.offsetWidth, h = node.offsetHeight;
    if (!w || !h) return;
    var n = function (v) { return Math.round(v * 100) / 100; };

    /* the plate's own corner: 8 on the two squares, a full round on the disc */
    var rr = parseFloat(getComputedStyle(node).borderTopLeftRadius);
    var r  = /%/.test(getComputedStyle(node).borderTopLeftRadius) || rr > h / 2 ? h / 2 : rr;

    var wall = 2, rShaft = Math.max(1, r - wall);
    var sx = wall, sy = wall, sw = w - wall * 2, sh = h - wall * 2;
    var T = h * 0.05;                 /* feGaussianBlur stdDeviation           */
    var S = h * 0.14;                 /* feSpecularLighting surfaceScale       */

    node.insertAdjacentHTML('afterbegin',
      '<svg class="cc-plate" viewBox="0 0 ' + n(w) + ' ' + n(h) + '" ' +
        'xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<defs>' +
        /* лампа — слабая */
        '<radialGradient id="' + id + 'l" cx="0.5" cy="1.05" r="0.8">' +
          '<stop offset="0"   stop-color="#DCEBFF" stop-opacity="0.16"/>' +
          '<stop offset="0.6" stop-color="#DCEBFF" stop-opacity="0.06"/>' +
          '<stop offset="1"   stop-color="#DCEBFF" stop-opacity="0"/>' +
        '</radialGradient>' +
        /* пластина — тёмная, полупрозрачная, сверху вниз */
        '<linearGradient id="' + id + 'p" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0"    stop-color="#FFFFFF" stop-opacity="0.09"/>' +
          '<stop offset="0.55" stop-color="#AFC6DE" stop-opacity="0.05"/>' +
          '<stop offset="1"    stop-color="#6E86A0" stop-opacity="0.03"/>' +
        '</linearGradient>' +
        /* объём — тот же порядок операций, три числа свои */
        '<filter id="' + id + 'v" x="-40%" y="-40%" width="180%" height="180%" ' +
          'color-interpolation-filters="sRGB">' +
          '<feGaussianBlur in="SourceAlpha" stdDeviation="' + n(T) + '" result="blur"/>' +
          '<feSpecularLighting in="blur" surfaceScale="' + n(S) + '" specularConstant="0.55" ' +
            'specularExponent="30" lighting-color="#ffffff" result="spec">' +
            '<fePointLight x="' + n(w * 0.16) + '" y="' + n(-h * 0.42) + '" z="' + n(h * 1.05) + '"/>' +
          '</feSpecularLighting>' +
          '<feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>' +
          '<feComposite in="SourceGraphic" in2="specIn" operator="arithmetic" ' +
            'k1="0" k2="1" k3="1" k4="0"/>' +
        '</filter>' +
      '</defs>' +

      /* оправа */
      '<rect x="0" y="0" width="' + n(w) + '" height="' + n(h) + '" rx="' + n(r) +
        '" fill="#0A0B0E"/>' +

      /* шахта */
      '<rect x="' + n(sx) + '" y="' + n(sy) + '" width="' + n(sw) + '" height="' + n(sh) +
        '" rx="' + n(rShaft) + '" fill="#0C0E12"/>' +

      /* лампа */
      '<rect x="' + n(sx) + '" y="' + n(sy) + '" width="' + n(sw) + '" height="' + n(sh) +
        '" rx="' + n(rShaft) + '" fill="url(#' + id + 'l)"/>' +

      /* пластина с объёмом */
      '<g filter="url(#' + id + 'v)">' +
        '<rect x="' + n(sx) + '" y="' + n(sy) + '" width="' + n(sw) + '" height="' + n(sh) +
          '" rx="' + n(rShaft) + '" fill="url(#' + id + 'p)"/>' +
      '</g>' +

      /* блик по верхней кромке */
      '<line x1="' + n(sx + rShaft) + '" y1="' + n(sy + 0.5) + '" x2="' + n(sx + sw - rShaft) +
        '" y2="' + n(sy + 0.5) + '" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="1"/>' +
      '</svg>');
  }

  qa('.bx-plate').forEach(function (p, i) { buildPlateGlass(p, 'ccpb' + i); });
  qa('.lc-play-face').forEach(function (p, i) { buildPlateGlass(p, 'ccpp' + i); });
  qa('.lc-dl').forEach(function (p, i) { buildPlateGlass(p, 'ccpd' + i); });


  /* The board is never seen empty. The feed and the calls table are seeded with
     events from this same scenario, which is also what retires the duplicated
     «Создана сделка: ABC Hotel» the frozen frame carried twice. */
  /* `back` pushes the whole seeded history further into the past. It is zero on
     the live board, where these five rows are simply the last few minutes. The
     freeze-frame passes the span it is about to wind through, because the still
     frame writes a history of its own on top of these rows and only replaces as
     many of them as that half ring really produced - three recordings, not five,
     now that fewer than three calls in ten reach anybody. Without the offset the
     rows left over from the seed carried times NEWER than the ones written over
     them, and the still frame stood with its recordings out of order. */
  function seed(back) {
    /* five kinds, five colours, and the same two-in-three failure the live feed
       carries - the opening screen must not promise a success rate the rest of
       the hour will not keep. The spacing is the live cadence, so nothing about
       the column changes character when the first real line arrives. */
    [['Отправлено КП', 1], ['Письмо ЛПР отправлено', 3], ['Выход на ЛПР', 5],
     ['Никто не ответил', 8], ['Секретарь не соединил', 12]
    ].forEach(function (p) {
      var k = eventKind(p[0]);
      feed.push({ text: p[0], time: hhmmBack(p[1] + back), kind: k });
      lastKindAt[k] = 0;               /* these five are already on the board */
    });
    [['Ани Строй', 2], ['Норк Медикал', 4], ['Каскад Отель', 7],
     ['Арарат Мебель', 11], ['Тигран Авто', 16]
    ].forEach(function (p) { calls.push({ name: p[0], time: hhmmBack(p[1] + back) }); });
    paintFeed(false);
    paintCalls(false);
  }

  /* The ring turns; the counters do not turn with it. resetCycle deals a new
     set of twenty fates and puts the three operators back on their phases -
     and touches nothing the client is reading. The whole of the old defect was
     the five lines that used to stand here, handing comp, lpr, inter, offer and
     the used sum back to their opening values every 210 seconds while a visitor
     watched the result, and the money already spent, jump backwards. */
  function resetCycle(loop) {
    buildCycle(loop);
    ops.forEach(function (op, i) {
      var frac = (PHASE[i] + loop * PHASE_ROTATE) % 1;
      op.off = frac * op.total;
      op.done = 0;
      while (op.cum[op.done] <= op.off) op.done++;
      op.painted = -1;
    });
  }

  /* What one company costs: its own length against the average one, at the
     project's own rate, on a burn that drifts ring by ring - so the budget bar
     and the plan bar stop moving as one. The last two lines are the only hard
     rules in the money: the used sum can never outrun the runway that is left,
     and can never pass the paid sum. */
  function burnAt(loop) { return 1 + COST_SWING * Math.sin(loop * 0.83 + COST_PHASE); }

  function costOf(dur, burn) {
    var c    = NOMINAL * COST_LEVEL * burn * (dur / AVG_DUR);
    var head = PAID - state.used;
    var left = PLAN - state.comp;
    if (left > 0) c = Math.min(c, head / left * 1.25);
    return Math.max(0, Math.min(c, head));
  }

  function companyCost(loop, dur) { return costOf(dur, burnAt(loop)); }

  function completeStep(op, loop) {
    var step = op.steps[op.done % op.steps.length];

    /* the recording is cut when the conversation ends */
    if (step.call) queueCall(step.client);

    if (step.events) {
      step.events.forEach(function (t) { enqueue(t, op.n, step.client); });
    }
    if (step.close) {
      state.used += companyCost(loop, step.close.dur);
      state.comp += 1;
      if (step.close.talked)     state.lpr   += 1;
      if (step.close.interested) state.inter += 1;
      if (step.close.offered)    state.offer += 1;
      paintNumbers(true);
      if (state.comp >= PLAN) beginClose();
    }
  }

  /* Non-zero only while the freeze-frame winds the cycle forward: the rows it
     leaves on screen then carry the times they would really have had, instead
     of five identical stamps from the instant the page opened. */
  var backMin = 0;

  /* ------------------------------------------------------------- the mixer
     Twenty companies close in every ring and they generate about forty lines,
     while five rows of feed can honestly carry six or seven of them in the same
     time. The mixer is what chooses, and it chooses on three rules:

        the line must be RECENT - nothing older than STALE_S seconds of board
          time is ever shown, so every row on the board belongs to a company one
          of the three operators has just finished;
        never three lines of one event type in a row, and never three from one
          operator in a row;
        where the rules leave a choice, a result line - a decision maker
          reached, a deal, a proposal, a refusal, a callback - beats a dial.

     When a line is emitted, everything OLDER than it is dropped: it has been
     superseded by newer work, and the feed's times can then never fall out of
     order. The pace is one line per PACE_S of wall clock, jittered by a few
     seconds off the emitted count so the column never ticks like a metronome -
     and never dumps four lines into one second the way the 700 ms drain did. */
  var queue = [], lastDrainT = -1e9, emitted = 0;
  var PACE_S  = 31;                    /* wall seconds between two feed lines  */

  /* A line older than this is yesterday's work and is dropped unsaid. It has to
     be several times the pace, not just above it: at 45 seconds against a 31-38
     second pace a line that lost ONE round was dead, and since a company emits
     its two rare lines eight seconds apart, one of the pair always lost that
     round. Measured: «Отправлено КП» was generated eight times in 2 700 board
     seconds and shown ZERO times, while «Создана сделка» - its own predecessor,
     from the same company - was shown five. A hundred seconds gives every line
     three turns. */
  var STALE_S = 100;
  var MAX_RUN = 2;
  var runKind = null, runOp = 0, runOpN = 0;

  /* Never under 31 wall seconds, which at two board seconds to the wall second
     is over a minute of board time - the floor that keeps two rows of the feed
     from printing the same HH:MM. The jitter on top of it comes off the count
     of lines already emitted, so the column never ticks like a metronome and
     nothing here needs a random number.

     The ONE exception is the period close, and it is deliberate: its three
     lines are paced four seconds apart because a close is one moment, not three
     minutes of work, so they share a stamp. Everything an operator does obeys
     the floor. */
  function paceS() { return PACE_S + (emitted * 7) % 8; }       /* 31 s .. 38 s */

  /* board seconds at which each event type was last put on the board */
  var lastKindAt = {};
  var STARVE_S = 45, STARVE_MAX = 8;
  var AGE_STEP = 6,  AGE_MAX    = 8;

  function starve(k) {
    var t = lastKindAt[k];
    if (t === undefined) return STARVE_MAX;        /* never yet said */
    return Math.min(STARVE_MAX, (simT - t) / STARVE_S);
  }

  function enqueue(text, opN, client) {
    var kind = eventKind(text);
    queue.push({ t: text, op: opN, k: kind, at: simT, co: client || null });
    while (queue.length && simT - queue[0].at > STALE_S) queue.shift();
  }

  /* An event type is never repeated on the row below itself. When the queue has
     nothing but the type just shown, the feed says NOTHING on that tick and
     waits a few seconds for the next company to finish - which costs at most a
     few seconds of pace and buys a column where «Письмо ЛПР отправлено» never
     stands on top of «Письмо ЛПР отправлено». The operator rule still allows
     two, because three rows from one operator is the thing it exists to stop. */
  function pick() {
    var i, e, best = -1, bestScore = -1, score;
    for (i = 0; i < queue.length; i++) {
      e = queue[i];
      if (simT - e.at > STALE_S) continue;
      if (e.k === runKind) continue;
      if (e.op === runOp && runOpN >= MAX_RUN) continue;
      /* The OLDEST line that is still current wins, not the freshest. Freshest
         starved a whole event type: every company books its decision maker and
         then closes its card six seconds later, so «Выход на ЛПР» was outranked
         by its own successor every single time and the green line the client
         came to see was never once shown. Taking the oldest still-current line
         samples the work evenly instead, and no type can be shut out.

         The head start goes to whatever has been WAITING longest to be said,
         not to whatever counts as a success. A flat bonus for result lines was
         tried and measured, and an independent audit costed it: it showed
         «Выход на ЛПР» 2.11 times more often than the project produces it and
         «Секретарь не соединил» 0.38 times as often, so the column read more
         successful than the cards beside it - the same flattery this заход
         exists to remove, moved from the numbers into the feed. Meanwhile the
         two lines a client actually waits for, «Создана сделка» and
         «Отправлено КП», are six each in a period of 175 companies, and a
         five-minute look had a 63 % chance of containing neither.

         Starvation fixes both at once. A type that has just been shown carries
         nothing; a type unseen for a while carries one place per 45 seconds, up
         to eight. Common lines are shown often, so they never accumulate any;
         rare ones accumulate and win the moment they occur, which is exactly
         what a proposal going out deserves. Nothing is over-shown, because a
         type can only win when it is genuinely in the queue.

         Both halves are capped at the same eight places, so neither can drown
         the other: a line reaches its full waiting weight after 48 seconds, a
         type its full starvation weight after six minutes. */
      score = Math.min(AGE_MAX, (simT - e.at) / AGE_STEP) + starve(e.k);
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  function drain(time) {
    var best = pick();
    if (best < 0) return false;
    var e = queue[best];
    queue.splice(best, 1);
    runKind  = e.k;
    lastKindAt[e.k] = simT;
    runOpN   = e.op === runOp ? runOpN + 1 : 1; runOp = e.op;
    emitted++;
    pushFeed(e.t, time);
    return true;
  }

  /* A line the board says itself, not one an operator produced. It still counts
     against the repeat rules, so the first ordinary line after a closing does
     not land on top of one of them. */
  function announce(text) {
    pushFeed(text, hhmmWork());
    runKind = eventKind(text);
    lastKindAt[runKind] = simT;
    runOp = 0; runOpN = 1;
  }

  /* ------------------------------------------------------ closing the period
     The plan is met, and that is an event, not a silent snap back to the start.
     The board holds the finished result for CLOSE_HOLD seconds: the three
     operators stop taking companies and stand on the same closing line, the
     numbers stay where they finished, and the feed says in three steps what has
     happened. Only then does a NEW period open - counters at zero against a
     fresh budget of the same 300 000, and the reporting window thirty days
     further on, which is the signal that cannot be mistaken for a glitch.

     The three closing lines take event types the feed already owns, so nothing
     new is introduced into a palette that has been signed off: a deal for the
     plan met, a despatched document for the report, a booked task for the
     period that opens. */
  var mode = 'run', modeAt = 0, closeLines = [], lastCloseAt = 0;
  var CLOSE_HOLD = 16;                 /* seconds the finished period stays up */
  var CLOSE_PACE = 4;

  function beginClose() {
    if (mode !== 'run') return;
    mode = 'close'; modeAt = simT; lastCloseAt = simT - CLOSE_PACE;
    queue.length = 0;
    runKind = null; runOp = 0; runOpN = 0;
    closeLines = [
      'План выполнен: ' + PLAN + ' компаний',
      'Период закрыт, отчёт отправлен'
    ];
    ops.forEach(function (op, i) {
      var last = op.steps[(op.done - 1 + op.steps.length) % op.steps.length];
      paintRow(i, { kind: 'crm', client: last ? last.client : '',
                    task: 'Итоги периода', next: 'Новый период' });
      op.painted = -2;                 /* forces a repaint when work resumes */
    });
  }

  /* The changeover is not an instant. Closing a month, invoicing it and opening
     the next one takes days, and the operators do not sit still through them:
     when the new period's report is opened, its first days are already in the
     books. So the counters do not come back at a bare zero - they come back at
     the thirty companies those days really produced, dealt from the same rates
     by the same generator and charged by the same rule. It is also the only way
     the four chips can be honest on the first screen: one interested lead out
     of one decision maker is a true 100 %, and it is exactly the number this
     board was rebuilt to stop printing. */
  /* Forty-two, not thirty. Thirty opened a period with two interested leads and
     one proposal, and the КП chip then printed 2 of 3 - a true, arithmetically
     obvious 67 % that is nevertheless the exact kind of figure this заход
     exists to keep off the board. Forty-two opens on three or four, which is
     the smallest denominator that cannot produce one. */
  var PERIOD_SEED = 42;

  function seedPeriod(loop) {
    var fates = spread(quotaBag(PERIOD_SEED, loop), rng(loop * 6151 + 22307));
    var i, j, list, cl;
    state.comp = 0; state.lpr = 0; state.inter = 0; state.offer = 0; state.used = 0;
    for (i = 0; i < fates.length; i++) {
      list = buildSteps('', fates[i]); cl = null;
      for (j = 0; j < list.length; j++) if (list[j].close) cl = list[j].close;
      /* charged at the flat rate, not at one ring's burn: these thirty companies
         are several days of work, not three and a half minutes of it */
      state.used += costOf(cl.dur, 1);
      state.comp += 1;
      if (cl.talked)     state.lpr   += 1;
      if (cl.interested) state.inter += 1;
      if (cl.offered)    state.offer += 1;
    }
  }

  function openPeriod() {
    mode = 'run';
    periodShift += 30;
    seedPeriod(curLoop + 1);
    lastDay = '';                      /* forces the new window onto the board */
    paintClock();
    paintNumbers(false);
    announce('Новый период: план ' + PLAN);
    lastDrainT = simT;
  }

  /* ================================================================ 8. LOOP */

  /* Two clocks. simT is board time and never stops - the event log rides on it,
     so a stamp written before the period closed and one written after it are
     still in the right order. runT is the RING's time and stops while the
     finished period is held on screen, so the sixteen seconds of the closing
     are not sixteen seconds of work nobody sees. */
  var lastNow = null, curLoop = -1, lastClockAt = 0, runT = 0;
  var DT_MAX = 0.25;                   /* a hidden tab must not skip an hour */

  function frame(now) {
    if (lastNow === null) lastNow = now;
    var dt = (now - lastNow) / 1000;
    lastNow = now;
    if (!(dt > 0)) dt = 0;
    if (dt > DT_MAX) dt = DT_MAX;
    simT += dt;

    if (mode === 'close') {
      var held = simT - modeAt;
      for (var j = 0; j < 3; j++) el.rows[j].time.textContent = mmss(held);
      if (closeLines.length && simT - lastCloseAt >= CLOSE_PACE) {
        lastCloseAt = simT;
        announce(closeLines.shift());
      }
      if (held >= CLOSE_HOLD) {
        openPeriod();
        runT = (curLoop + 1) * CYCLE;  /* the new period starts on a fresh ring */
      }
      if (now - lastClockAt >= 200) { lastClockAt = now; paintClock(); }
      requestAnimationFrame(frame);
      return;
    }

    runT += dt;
    var loop = Math.floor(runT / CYCLE);
    var cyc  = runT - loop * CYCLE;

    /* The ring turning is a change of company, not a break in the day. It used
       to throw the pending lines away and forget which type was last shown,
       because everything downstream of it was being reset anyway; now that the
       counters carry over, so does the feed - otherwise the first line after
       every 210 seconds could, and did, land on top of its own twin. */
    if (loop !== curLoop) { curLoop = loop; resetCycle(loop); }

    var active = cyc <= CYCLE_ACTIVE;
    var walk = Math.min(cyc, CYCLE_ACTIVE);

    for (var i = 0; i < 3; i++) {
      var op = ops[i];

      if (active && mode === 'run') {
        /* at the very end of the active phase the ring is closed exactly, not by
           floating point: the twentieth company must close, never miss by an ulp */
        var pos = walk >= CYCLE_ACTIVE ? op.off + op.total : op.off + walk * op.speed;
        while (pos >= endAt(op, op.done)) {
          completeStep(op, loop); op.done++;
          /* the plan was met on that company. At the ring's last tick this loop
             closes a whole queue at once, and without this the counter would
             walk past 175 and the board would print 101 % of the plan before
             the closing it has already begun could put it on screen. */
          if (mode !== 'run') break;
        }
      }
      if (mode !== 'run') break;       /* the plan was met inside this very tick */

      var start = op.done === 0 ? 0 : endAt(op, op.done - 1);
      var idx = op.done % op.steps.length;

      if (op.painted !== op.done) { op.painted = op.done; paintRow(i, op.steps[idx]); }

      /* the timer never stops: during the fifteen-second pause it is the only
         thing on the board that still moves */
      var elapsed = op.off + cyc * op.speed - start;
      el.rows[i].time.textContent = mmss(elapsed);
    }

    if (mode === 'run' && queue.length && simT - lastDrainT >= paceS() && drain(null))
      lastDrainT = simT;
    if (mode === 'run' && callQ.length && simT - lastCallT >= callPaceS() && drainCall(null))
      lastCallT = simT;

    if (now - lastClockAt >= 200) { lastClockAt = now; paintClock(); }
    requestAnimationFrame(frame);
  }

  /* ----------------------------------------------------------- reduced motion
     A freeze-frame mid-cycle: the simulation is wound forward to the middle of
     a loop, painted once and left there. The light stays on and steady, the
     breathing and the flares never start, and the clock keeps real time -
     it is information, not motion.

     The stated preference is the ONLY trigger. Two hardware guesses used to sit
     here as well - hardwareConcurrency <= 2 and deviceMemory <= 2 - and they were
     dropped: with both forced down to 1, the board does not freeze at any CPU
     throttle rate tried, including the heaviest - the feed rows, the three
     operator timers and the KPI numbers all keep advancing, watched changing
     state over tens of seconds rather than a single frame-rate reading, which
     measured chaotic on this instrument and is not cited here for that reason.
     The guard bought no smoothness that state-level observation could detect,
     and it cost a dead board on any machine that under-reports its cores, which
     is most locked-down office hardware and every browser with a privacy
     shield. Nobody who has not asked for stillness gets it. */
  function prefersStill() {
    try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return true; } catch (e) {}
    return false;
  }

  function freezeFrame() {
    document.documentElement.setAttribute('data-cc-still', '');
    resetCycle(0);

    /* wound forward a second at a time across all three operators at once, not
       one operator to the end and then the next: otherwise the five rows left
       in the feed would all come from whichever operator ran last.

       A ring and a half, not half a ring. The three rows land on exactly the
       same step either way - a whole ring is a whole number of steps for every
       operator - but the extra ring is the history the two tables need: fewer
       than three calls in ten now reach anybody, so half a ring produced three
       recordings and left two rows of the seed standing under them.

       The wind uses the LIVE pacing and the live clock rate, not a private one.
       The old still frame emitted a line every six seconds and called six
       seconds a minute; the live board emits one every thirty-odd and calls
       thirty a minute. Two boards, two speeds, and the still one was the odd
       one out - it is now wound by the same two rules the live one obeys. */
    var walk = CYCLE_ACTIVE * 1.5, t, i, op, pos;
    for (t = 0; t <= walk; t++) {
      simT = t;
      backMin = Math.round((walk - t) * WORK_RATE / 60);
      for (i = 0; i < 3; i++) {
        op = ops[i];
        pos = op.off + t * op.speed;
        while (pos >= endAt(op, op.done)) { completeStep(op, 0); op.done++; }
      }
      if (queue.length  && t - lastDrainT >= paceS()     && drain(hhmmBack(backMin)))
        lastDrainT = t;
      if (callQ.length  && t - lastCallT  >= callPaceS() && drainCall(hhmmBack(backMin)))
        lastCallT = t;
    }
    backMin = 0;

    ops.forEach(function (op, i) {
      var start = op.done === 0 ? 0 : endAt(op, op.done - 1);
      paintRow(i, op.steps[op.done % op.steps.length]);
      el.rows[i].time.textContent = mmss(op.off + walk * op.speed - start);
    });
    paintNumbers(false);
    paintClock();
    setInterval(paintClock, 1000);
  }

  still = prefersStill();

  /* the still frame writes its own history over these five rows; whatever it
     does not reach must still be OLDER than what it does, so the seed is pushed
     back by the whole span the wind is about to cover */
  seed(still ? Math.ceil(CYCLE_ACTIVE * 1.5 * WORK_RATE / 60) + 1 : 0);

  if (still) {
    freezeFrame();
  } else {
    resetCycle(0);
    paintNumbers(false);               /* the opening state, before any motion */
    requestAnimationFrame(frame);
  }

  /* the tariff is part of the contract this board reports on and has no box in
     the frame; parked here so the model stays complete and auditable */
  board.setAttribute('data-cc-tariff', TARIFF);
})();
