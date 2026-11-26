// Chess v2.2 texts (English / فارسی): game modes, Mode Creator, Position Editor, lobby, custom & AI bots,
// exotic badges, board designer, admin events. Pages add their own with extend() too.
import { extend } from "./i18n.js?v=73cda5a6b6";

extend({
  // navigation
  modes: ["Modes", "حالت‌ها"], editor: ["Position editor", "ویرایشگر وضعیت"],
  // game screen
  pocket_empty: ["pocket empty", "جیب خالی"], ai_thinking: ["is thinking…", "دارد فکر می‌کند…"],
  double_second: ["Double Move — make your second move", "حرکت دوبل — حرکت دومت را بزن"],
  ai_illegal_n: ["Illegal moves by the AI: {n}", "حرکت‌های غیرقانونی هوش مصنوعی: {n}"],
  wild_spawn: ["A piece appeared out of nowhere", "مهره‌ای از هیچ ظاهر شد"],
  wild_teleport: ["Illegal move (teleport)", "حرکت غیرقانونی (تلپورت)"],
  wild_self: ["Took its own piece", "مهره خودش را زد"], wild_king: ["Captured a king", "شاه را زد"],
  wild_castle: ["Illegal castling", "قلعه غیرقانونی"],
  replay_note_wild: ["The AI played illegal moves — Stockfish can't judge this game. Here it is move by move.", "هوش مصنوعی حرکت غیرقانونی زد — استاک‌فیش نمی‌تواند این بازی را بررسی کند. این هم حرکت به حرکت."],
  replay: ["Replay", "بازپخش"], replay_play: ["Play the moves", "پخش حرکت‌ها"], replay_pause: ["Pause", "توقف"],replay_note: ["This game's rules can't be checked by Stockfish — here are the moves.", "قوانین این بازی را استاک‌فیش بررسی نمی‌کند — این‌ها حرکت‌ها هستند."],
  rules: ["Rules", "قوانین"],
  // play page
  mode_label: ["Game mode", "حالت بازی"], standard: ["Standard", "استاندارد"], more_modes: ["All modes…", "همه حالت‌ها…"],
  casual_note: ["Game modes are casual (no rating change).", "حالت‌های بازی رسمی نیستند (امتیاز تغییر نمی‌کند)."],
  lobby: ["Open challenges", "چالش‌های باز"], lobby_empty: ["Nobody is waiting — start a seek and others can join.", "کسی منتظر نیست — جستجو را شروع کن تا بقیه بیایند."],
  join: ["Join", "ورود"], live_games: ["Live games", "بازی‌های زنده"], watch: ["Watch", "تماشا"],
  your_seek: ["your seek", "جستجوی تو"],
  invite_title: ["Play a friend", "بازی با دوست"], invite_color: ["Your colour", "رنگ تو"], invite_make: ["Create invite", "ساخت دعوت"],
  invite_web: ["Website link", "لینک سایت"], invite_bale: ["Bale link", "لینک بله"],
  invite_share: ["Send one of these links to your friend. The game starts when they open it.", "یکی از این لینک‌ها را برای دوستت بفرست. وقتی باز کند بازی شروع می‌شود."],
  join_title: ["You're invited!", "دعوت شدی!"], join_btn: ["Accept & play", "قبول و بازی"],
  join_login: ["Log in or sign up to accept.", "برای قبول کردن وارد شو یا ثبت‌نام کن."],
  // bots page
  my_bots: ["Bot Creator's bots", "ربات‌های ساخته‌شده"], ai_bots: ["AI models", "مدل‌های هوش مصنوعی"],
  ai_bot_note: ["An AI chat model. It only answers with its move — and it may play ANY move, even illegal ones (a piece from nowhere, taking its own pieces…). You play by the rules.",
    "یک مدل چت هوش مصنوعی. فقط حرکتش را می‌گوید — و ممکن است هر حرکتی بزند، حتی غیرقانونی (مهره از هیچ، زدن مهره خودش…). تو با قوانین بازی می‌کنی."],
  ai_legal_note: ["An AI chat model that must play legal moves.", "یک مدل هوش مصنوعی که باید حرکت قانونی بزند."],
  inf_rating: ["Infinite rating", "امتیاز بی‌نهایت"], play_from: ["Start position", "وضعیت شروع"],
  normal_start: ["Normal start", "شروع معمولی"], server_game: ["Plays on the game server", "روی سرور بازی اجرا می‌شود"],
  bot_record: ["Bot record", "کارنامه ربات"], beaten_by: ["beaten {n}×", "{n} بار شکست خورده"],
  login_for_bot: ["Log in (or open from Bale) to play this bot.", "برای بازی با این ربات وارد شو (یا از بله باز کن)."],
  // settings
  dots_style: ["Move dots", "نقطه‌های حرکت"], dots_sub: ["How the squares you can move to are shown.", "خانه‌هایی که می‌توانی بروی چطور نشان داده شوند."],
  dots_bold: ["Bold (always visible)", "پررنگ (همیشه پیدا)"], dots_ring: ["Ring", "حلقه"], dots_glow: ["Glow", "درخشان"],
  dots_classic: ["Classic (faint)", "کلاسیک (کم‌رنگ)"], dots_big: ["Big", "بزرگ"],
  fx_toggle: ["Animations & effects (moving pieces, glowing boards, event confetti…)", "انیمیشن و افکت‌ها (حرکت مهره‌ها، درخشش صفحه، کاغذرنگی رویدادها…)"],
  secret_board: ["Secret board", "صفحه مخفی"], new_tag: ["NEW", "جدید"], custom_board: ["Special", "ویژه"],
  // profile
  badges: ["Badges", "نشان‌ها"], vs_bots: ["vs bots", "مقابل ربات‌ها"], vs_ai: ["vs AI", "مقابل هوش مصنوعی"],
  modes_played: ["Game modes", "حالت‌های بازی"], modes_made: ["Modes made", "حالت‌های ساخته‌شده"], wins_in: ["{n} wins", "{n} برد"],
  retired: ["Retired", "بازنشسته"], exotic: ["Exotic", "اگزوتیک"], r_exotic: ["Exotic", "اگزوتیک"], progress: ["Progress", "پیشرفت"],
  // events
  ev_ends: ["ends in {t}", "{t} تا پایان"], ev_live: ["EVENT", "رویداد"],
  ev_x2: ["×{n} rating gains", "امتیاز ×{n}"], ev_noloss: ["No rating loss", "بدون کم شدن امتیاز"],
  ev_free: ["All boards free", "همه صفحه‌ها رایگان"], ev_puzzle: ["Puzzle rating ×{n}", "امتیاز معما ×{n}"],
  ev_badge: ["Badge for showing up", "نشان برای حضور"], ev_mode: ["Featured mode", "حالت ویژه"],
});

export const V = "73cda5a6b6";
