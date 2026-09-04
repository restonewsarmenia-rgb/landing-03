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
   companies at the same instant, at the end of a 3.5-minute loop. The status
   timer therefore counts the operator's own real seconds (a call runs 00:00 ->
   02:30, which is where the design's 02:31 comes from) off a wall clock that
   never drifts: it is driven by performance.now(), not by a frame counter.
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

  var START = { comp: 120, lpr: 80, inter: 44, offer: 18, used: 206000 };
  var END   = { comp: 140, lpr: 93, inter: 51, offer: 21, used: 240000 };

  /* Twenty companies, so every closure carries the same slice of the budget and
     the used sum lands on 240 000 exactly, never by a correction at the end. */
  var COST_PER_COMPANY = (END.used - START.used) / 20;     // 1700

  /* The design's own bar is 205px wide at 69%. Anchoring the scale there keeps
     the accepted frame pixel-exact at the start of every loop, instead of
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
     Fates are fixed in advance; nothing here is generated. Within each operator
     the fates alternate, so a row never shows the same outcome twice running.

     op 1 — six interested: three ask for an offer, three give a soft yes.
     op 2 — seven no-contacts: four are stopped at the secretary, three are
            never picked up at all and get no secretary phase.
     op 3 — six refusals plus one company that asks to be called back.        */
  var SCEN = [
    { op: 1, name: 'Арарат Мебель',   fate: 'offer'  },
    { op: 1, name: 'Ани Строй',       fate: 'soft'   },
    { op: 1, name: 'Гарни Фуд',       fate: 'offer'  },
    { op: 1, name: 'Ереван Текстиль', fate: 'soft'   },
    { op: 1, name: 'Масис Агро',      fate: 'offer'  },
    { op: 1, name: 'Вардаван Пласт',  fate: 'soft'   },

    { op: 2, name: 'Ширак Металл',    fate: 'sec'    },
    { op: 2, name: 'Зангу Транс',     fate: 'silent' },
    { op: 2, name: 'Аштарак Бетон',   fate: 'sec'    },
    { op: 2, name: 'Лори Вуд',        fate: 'silent' },
    { op: 2, name: 'Мегри Фрукт',     fate: 'sec'    },
    { op: 2, name: 'Вернисаж Декор',  fate: 'silent' },
    { op: 2, name: 'Апаран Молоко',   fate: 'sec'    },

    { op: 3, name: 'Норк Медикал',    fate: 'refuse' },
    { op: 3, name: 'Каскад Отель',    fate: 'refuse' },
    { op: 3, name: 'Севан Логистик',  fate: 'soft'   },
    { op: 3, name: 'Тигран Авто',     fate: 'refuse' },
    { op: 3, name: 'Кентрон Кафе',    fate: 'refuse' },
    { op: 3, name: 'Багратуни Дент',  fate: 'refuse' },
    { op: 3, name: 'Раздан Пекарня',  fate: 'refuse' }
  ];

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

  function buildSteps(co) {
    var out = [], a;

    function add(kind, opt) {
      opt = opt || {};
      var st = ST[kind];
      out.push({
        kind:   kind,
        client: co.name,
        task:   opt.task !== undefined ? opt.task : st.t,
        next:   opt.next !== undefined ? opt.next : st.n,
        dur:    st.d,
        events: opt.events || null,
        close:  opt.close || null
      });
      return out[out.length - 1];
    }

    if (co.fate === 'sec' || co.fate === 'silent') {
      var miss = co.fate === 'sec' ? 'Секретарь не соединил' : 'Никто не ответил';
      add('search');
      for (a = 1; a <= 5; a++) {
        add('dial', { task: 'Дозвон, ' + a + ' из 5' });
        if (co.fate === 'sec') add('sec');
        /* attempts one to four report themselves as soon as they fail; the
           fifth waits for the letter, so its three lines stay consecutive */
        if (a < 5) out[out.length - 1].events = [miss, 'Попытка ' + a + ' из 5'];
      }
      add('crm', { next: 'Письмо ЛПР' });
      add('mail', {
        events: [miss, 'Попытка 5 из 5', 'Письмо ЛПР отправлено'],
        close:  { talked: false, interested: false, offered: false }
      });
      return out;
    }

    add('search');
    add('dial', { task: 'Дозвон, 1 из 5' });
    add('talk');

    if (co.fate === 'refuse') {
      add('crm', {
        next:   'Закрыть контакт',
        events: ['Выход на ЛПР', 'Контакт закрыт: отказ'],
        close:  { talked: true, interested: false, offered: false }
      });
    } else if (co.fate === 'soft') {
      add('crm', { next: 'Перезвонить' });
      add('follow', {
        events: ['Выход на ЛПР', 'Задача: перезвонить'],
        close:  { talked: true, interested: true, offered: false }
      });
    } else {                                                    /* offer */
      add('crm', { next: 'Письмо ЛПР' });
      add('mail', {
        events: ['Выход на ЛПР', 'Создана сделка', 'Отправлено КП'],
        close:  { talked: true, interested: true, offered: true }
      });
    }
    return out;
  }

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
     exactly the active part of the loop, whatever its real length: op 2 has
     five attempts on every one of its seven companies and simply works faster
     on screen than the other two. Over one loop each ring turns exactly once,
     so all twenty companies close and the counters land on 140 / 93 / 51 / 21
     by construction, never by a nudge at the end. */

  var CYCLE_ACTIVE = 195;                              /* seconds of wall clock */
  var CYCLE_PAUSE  = 15;                               /* only the timers move  */
  var CYCLE        = CYCLE_ACTIVE + CYCLE_PAUSE;       /* 3.5 minutes           */

  /* deterministic, non-harmonic starting points, so the three rows never step
     together; the loop index rotates them, so no two loops look alike */
  var PHASE = [0.00, 0.41, 0.73];
  var PHASE_ROTATE = 0.137;

  var ops = [1, 2, 3].map(function (n) {
    var steps = [], cum = [], sum = 0;
    SCEN.forEach(function (co) {
      if (co.op !== n) return;
      buildSteps(co).forEach(function (s) { steps.push(s); });
    });
    steps.forEach(function (s) { sum += s.dur; cum.push(sum); });
    return {
      n: n, steps: steps, cum: cum, total: sum,
      speed: sum / CYCLE_ACTIVE,     /* real seconds per wall second */
      off: 0, done: 0, painted: -1
    };
  });

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

    var a = shiftDays(t, -20), b = shiftDays(t, 10);
    el.range.textContent = a.d + ' ' + MON_SHORT[a.m - 1] + ' — ' +
                           b.d + ' ' + MON_SHORT[b.m - 1] + ' ' + b.y;
  }

  function hhmmNow() {
    var t = yerevan(new Date());
    return pad2(t.h) + ':' + pad2(t.mi);
  }

  function hhmmBack(minutes) {
    var t = yerevan(new Date(Date.now() - minutes * 60000));
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

  var state = { comp: 0, lpr: 0, inter: 0, offer: 0, used: 0 };

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
    el.priceL.textContent = to100(state.used / state.lpr);
    el.priceI.textContent = to100(state.used / state.inter);

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
    feed.unshift({ text: text, time: time || hhmmNow(), kind: eventKind(text) });
    feed.length = 5;
    paintFeed(true);
  }

  /* --------------------------------------------------------------- last calls
     Only companies where a conversation with the decision maker really took
     place reach this table - thirteen of the twenty. Time and name, nothing
     else; the waveform and the download disc stay as the design's furniture. */
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

  function pushCall(name, time) {
    calls.unshift({ name: name, time: time || hhmmNow() });
    calls.length = 5;
    paintCalls(true);
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
  function seed() {
    [['Отправлено КП', 4], ['Создана сделка', 5], ['Выход на ЛПР', 6],
     ['Попытка 3 из 5', 11], ['Секретарь не соединил', 12]
    ].forEach(function (p) {
      feed.push({ text: p[0], time: hhmmBack(p[1]), kind: eventKind(p[0]) });
    });
    [['Ани Строй', 4], ['Норк Медикал', 9], ['Каскад Отель', 17],
     ['Арарат Мебель', 24], ['Тигран Авто', 31]
    ].forEach(function (p) { calls.push({ name: p[0], time: hhmmBack(p[1]) }); });
    paintFeed(false);
    paintCalls(false);
  }

  function resetCycle(loop) {
    state.comp = START.comp; state.lpr = START.lpr; state.inter = START.inter;
    state.offer = START.offer; state.used = START.used;
    paintNumbers(false);                          /* one frame, no animation */
    ops.forEach(function (op, i) {
      var frac = (PHASE[i] + loop * PHASE_ROTATE) % 1;
      op.off = frac * op.total;
      op.done = 0;
      while (op.cum[op.done] <= op.off) op.done++;
      op.painted = -1;
    });
  }

  function completeStep(op) {
    var step = op.steps[op.done % op.steps.length];
    if (step.events) {
      step.events.forEach(function (t) { enqueue(t, op.n); });
    }
    if (step.close) {
      state.comp  += 1;
      state.used  += COST_PER_COMPANY;
      if (step.close.talked)     state.lpr   += 1;
      if (step.close.interested) state.inter += 1;
      if (step.close.offered)    state.offer += 1;
      paintNumbers(true);
      if (step.close.talked) pushCall(step.client, backMin ? hhmmBack(backMin) : null);
    }
  }

  /* Non-zero only while the freeze-frame winds the cycle forward: the rows it
     leaves on screen then carry the times they would really have had, instead
     of five identical stamps from the instant the page opened. */
  var backMin = 0;

  /* ------------------------------------------------------------- the mixer
     Operator 02 carries thirty-five dials and seven letters against the other
     two operators' twenty-nine results, so left to run in generation order the
     feed fills with «Никто не ответил» and the client sees nothing but failure.
     The generation is NOT touched - the counters hang off it, and they are
     signed off - so the mixing happens here, at the point of output:

        never three lines of one event type in a row, and
        never three lines from one operator in a row.

     Only operators 01 and 03 ever produce a result line, so the second rule on
     its own puts at least one result inside any five consecutive rows, and both
     rules together put at least two operators there.

     When every pending line is blocked, nothing is emitted on that tick and the
     queue waits. A queue longer than QUEUE_MAX drops its oldest NON-result
     line, so what the feed shows is always recent work and never a backlog;
     result lines are never dropped. */
  var queue = [], lastDrain = 0;
  var DRAIN_MS = 700;
  var QUEUE_MAX = 12;
  var MAX_RUN = 2;
  var runKind = null, runKindN = 0, runOp = 0, runOpN = 0;

  function enqueue(text, opN) {
    var kind = eventKind(text), i;
    queue.push({ t: text, op: opN, k: kind, result: EV[kind].result });
    if (queue.length <= QUEUE_MAX) return;
    for (i = 0; i < queue.length; i++) {
      if (!queue[i].result) { queue.splice(i, 1); return; }
    }
    queue.shift();
  }

  function drain(time) {
    for (var i = 0; i < queue.length; i++) {
      var e = queue[i];
      if (e.k === runKind && runKindN >= MAX_RUN) continue;
      if (e.op === runOp  && runOpN   >= MAX_RUN) continue;
      queue.splice(i, 1);
      runKindN = e.k  === runKind ? runKindN + 1 : 1; runKind = e.k;
      runOpN   = e.op === runOp   ? runOpN   + 1 : 1; runOp   = e.op;
      pushFeed(e.t, time);
      return true;
    }
    return false;
  }

  /* ================================================================ 8. LOOP */

  var t0 = null, curLoop = -1, lastClockAt = 0;

  function frame(now) {
    if (t0 === null) t0 = now;
    var t = (now - t0) / 1000;
    var loop = Math.floor(t / CYCLE);
    var cyc  = t - loop * CYCLE;

    if (loop !== curLoop) {
      curLoop = loop; resetCycle(loop);
      queue.length = 0;
      runKind = null; runKindN = 0; runOp = 0; runOpN = 0;
    }

    var active = cyc <= CYCLE_ACTIVE;
    var walk = Math.min(cyc, CYCLE_ACTIVE);

    for (var i = 0; i < 3; i++) {
      var op = ops[i];

      if (active) {
        /* at the very end of the active phase the ring is closed exactly, not by
           floating point: the twentieth company must close, never miss by an ulp */
        var pos = walk >= CYCLE_ACTIVE ? op.off + op.total : op.off + walk * op.speed;
        while (pos >= endAt(op, op.done)) { completeStep(op); op.done++; }
      }

      var start = op.done === 0 ? 0 : endAt(op, op.done - 1);
      var idx = op.done % op.steps.length;

      if (op.painted !== op.done) { op.painted = op.done; paintRow(i, op.steps[idx]); }

      /* the timer never stops: during the fifteen-second pause it is the only
         thing on the board that still moves */
      var elapsed = op.off + cyc * op.speed - start;
      el.rows[i].time.textContent = mmss(elapsed);
    }

    if (queue.length && now - lastDrain >= DRAIN_MS && drain(null)) lastDrain = now;

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
       in the feed would all come from whichever operator ran last */
    var walk = CYCLE_ACTIVE / 2, t, i, op, pos;
    for (t = 0; t <= walk; t++) {
      backMin = Math.ceil((walk - t) / 6);
      for (i = 0; i < 3; i++) {
        op = ops[i];
        pos = op.off + t * op.speed;
        while (pos >= endAt(op, op.done)) { completeStep(op); op.done++; }
        if (queue.length) drain(hhmmBack(backMin));
      }
    }
    backMin = 0;
    while (queue.length && drain(hhmmNow())) { /* flush what the rules still allow */ }

    ops.forEach(function (op, i) {
      var start = op.done === 0 ? 0 : endAt(op, op.done - 1);
      paintRow(i, op.steps[op.done % op.steps.length]);
      el.rows[i].time.textContent = mmss(op.off + walk * op.speed - start);
    });
    paintNumbers(false);
    paintClock();
    setInterval(paintClock, 1000);
  }

  seed();

  if (prefersStill()) {
    still = true;
    freezeFrame();
  } else {
    resetCycle(0);
    requestAnimationFrame(frame);
  }

  /* the tariff is part of the contract this board reports on and has no box in
     the frame; parked here so the model stays complete and auditable */
  board.setAttribute('data-cc-tariff', TARIFF);
})();
