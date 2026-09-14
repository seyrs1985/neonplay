/* Neon Typing — word bank (300 common English words, 3 length tiers) +
 * deterministic seeded RNG. The daily challenge hashes the UTC date so every
 * player worldwide gets the exact same word stream. Zero external requests. */
'use strict';

const WT = (() => {
  /* tier 0: 3-4 letters (100) */
  const T0 = ('cat dog sun run map key jet fox box ice arc ash ban bee bet bow bus cap cup den dew ' +
    'dot duo egg elf era eve eye fan fig fin flu fly fog gap gel gem gum hat hen hid him hip hit ' +
    'hub hug hut ink jab jam jar jug kit lab lad lap law lid lip log lot low mat mud mug nap net ' +
    'nod nut oak oat odd orb ore owl pad pan paw pen pet pig pin pit pop pot pro pub pun pup rag ' +
    'ram ran rap rat raw ray red rib rid rim rip rob rod rot row rub rug rum rut sad sag sat saw ' +
    'set sew shy sin sip sir sit six ski sky sob son soy spa spy tab tag tan tap tax ten tin tip ' +
    'toe ton top toy try tub tug two use van vat vet via vow wag war was wax way web wed wet who ' +
    'why wig win wit wok won wow yak yam yet you zap zip zoo').split(/\s+/);
  /* tier 1: 5-6 letters (110) */
  const T1 = ('about above actor adapt admit adopt after again agent agree ahead alarm album alert ' +
    'alike alive allow alone along alter amber angle ankle apple apply arena argue armor aroma ' +
    'array arrow aside asset audio avoid awake award aware badge baker basic beach begin below ' +
    'bench berry birth black blade blame blank blast blaze blend blind block bloom board boast ' +
    'bonus boost bound brain brand brave bread break brick brief bring broad brush build bunch ' +
    'burst cabin candy cargo carve catch cause chain chair chalk charm chart chase cheap check ' +
    'cheek cheer chess chest chief child chill choir chord chunk civic claim clash class clean ' +
    'clear clerk click cliff climb clock close cloth cloud clown coach coast color comet comic ' +
    'coral couch count court cover crack craft crane crash crazy cream crest crime crisp cross ' +
    'crowd crown curve cycle daily dairy dance dealt debut decay delay delta dense depth diary ' +
    'dirty dodge donor doubt dozen draft drama dream dress drift drill drink drive drone eager ' +
    'eagle early earth eaten ebony edit eight elbow elder elect elite empty enemy enjoy enter ' +
    'entry epoch equal error essay event every exact exist extra fable faith fancy fault favor ' +
    'feast fence ferry fever fiber field fiery fifth fifty fight final flame flash fleet flesh ' +
    'float flock flood floor flour fluid focus force forge forth forty forum found frame fraud ' +
    'fresh fried front fruit fully funny gauge ghost giant given glass globe glory glove going ' +
    'grace grade grain grand grant grape graph grasp grass grave great green greet grief grill ' +
    'group guard guess guest guide guilt habit happy harsh heart heavy hedge hello hence hobby ' +
    'honey honor horse hotel house human humid hurry ideal image imply index inner input irony ' +
    'issue ivory jewel joint judge juice jolly kneel knife knock known label labor large laser ' +
    'later laugh layer learn lease least leave legal lemon level lever light limit linen liver ' +
    'lobby local lodge logic loose lower loyal lucky lunar lunch lying magic major maker mango ' +
    'maple march match maybe mayor medal media melon mercy merge merit metal meter midst might ' +
    'minor minus mixer model money month moral motor mount mouth movie music nasty naval nerve ' +
    'never newly night noble noise north noted novel nurse oasis occur ocean offer often olive ' +
    'onion orbit order organ other otter ounce outer owner paint panel panic paper party pasta ' +
    'patch pause peace peach pearl pedal penny perch phase phone photo piano piece pilot pinch ' +
    'pitch pixel pizza place plain plane plank plant plaza point polar pride prime prize proof ' +
    'proud pulse punch pupil puzzle rabbit random rarely rather reason recall record reduce ' +
    'reform refuse regard region relate relief remain remark remote remove repair reply report ' +
    'rescue reset resin retro rhyme rhythm right rival robot rocky rough round route royal rugby ' +
    'runner saddle safari safety salary sample sauce scale scene scent scope score scout scream ' +
    'screen script sculpt sealed season second secret sector select senior sensor serial series ' +
    'sermon serve setup seven shadow shaped shared shield shimmer simple singer single sister ' +
    'sketch slalom sleeve slogan smooth soccer socket solid solve sound source space spark speak ' +
    'speed spell spend spice spike split spoke sport spray spread spring sprint square squash ' +
    'stable stand start state steam steel steep stem step stick still sting stock stone stood ' +
    'store storm story stove strap straw strip studio study style sugar suite sunny supper ' +
    'supply surf surge swamp swear sweep sweet swim swing switch symbol system table tackle ' +
    'tail take talent target taste teach tempo tenant tender tennis thank theme thick thing ' +
    'think third those thread threat thrive throat throw thumb ticket tidal tiger timber tiny ' +
    'title toast today token tomato topic torch total touch tough towel tower trace track trade ' +
    'trail train trait travel treat trend trial tribe trick troop truck true trunk trust truth ' +
    'tulip tune tunnel turbo twelve twenty ultra uncle under union unique united unless until ' +
    'upper upset urban usage usual valid value vapor vault vegan venue verse video vigor villa ' +
    'vinyl viral virus visit vital vivid vocal voice voltage voter wafer wagon waist wander ' +
    'warmth waste water weary weave wedge weigh weird whale wheat wheel where which while white ' +
    'whole widow width windy winter wisdom witch witty wolf woman wonder world worth would wound ' +
    'wrist write yield young zebra zenith zephyr zigzag').split(/\s+/);
  /* tier 2: 7+ letters (90) */
  const T2 = ('ability absence academy account achieve acquire address advance adverse advice ' +
    'airport almond already amazing ancient another anxiety anybody appeal appear arrange ' +
    'arrival artist aspect assault attempt attract auction average awesome balance balloon ' +
    'bankrupt barbecue battle beach beautiful because become bedroom believe beneath benefit ' +
    'bicycle billion biology blanket blossom bottleneck bounce bravery brother browse bubble ' +
    'buffalo bungalow burial burning cabinet cactus camera campaign candle canopy capsule ' +
    'captain caption capture careful cargo carpet carrot castle casual caution ceiling ' +
    'cellar cement centaur century certain chamber channel chapter charity charter chassis ' +
    'cheetah chimney choice chorus cinnamon citizen clarity classic climate clinic closure ' +
    'clothes collect college combine comfort command comment compact company compare compete ' +
    'complex concept concern concert conduct confirm connect consist contact contain content ' +
    'contest context control convert cooking correct cottage cotton country courage crystal ' +
    'culture curious current curtain custom cylinder describe dessert develop diamond digital ' +
    'dilemma diploma disease display distant divorce dolphin domain domestic dominant dragon ' +
    'dramatic dynamic eastern economy edition elegant element embassy embrace emotion empire ' +
    'employ energy enhance enormous ensure entire episode equity essence evening exactly ' +
    'examine example excited exclude exhibit expense explain explore express extreme factory ' +
    'faculty fashion feather federal festival fiction fifteen finance finding fitness flavor ' +
    'flight flowers forever formula fortune forward freedom freight furious galaxy gallery ' +
    'gambling gasoline generic genuine gesture glimpse grammar gravity grocery growing guitar ' +
    'hammock handful harmony harvest hazard heading healthy hearing heated heaven height ' +
    'helmet heroic history holiday horizon hostile hundred hybrid immense Imperial ' +
    'incident increase incredible index indoor infant inform insight inspire instant instead ' +
    'intelligence intense involve jacket jamboree jeopardy judgment junction jungle junior ' +
    'justice keenly kidney kindly knowledge laboratory language lantern largest launch lawyer ' +
    'leadership leather lecture lengthy lesson liberty library license limited liquid listing ' +
    'longest lottery loudness loyalty lucky machine magnetic majestic mammal manager mantle ' +
    'manufacture marathon marble margin marine market marshal marvel massive meadow medical ' +
    'medieval member memory mentor merely message meteor method middle mighty million mineral ' +
    'ministry miracle mission mistake mixture mobile modern modest moisture moment momentum ' +
    'monarch monster monthly morning mortgage motif mountain mumble mural museum mutual mystery ' +
    'namely narrow nation native nature nearby nearly needle nervous network neutral newcomer ' +
    'nickname nostril notched notion nougat nowhere nuclear numerous nursemaid nurture nutrient ' +
    'obscure observe obstacle obtain obvious occupy offense officer ongoing opening opera ' +
    'operate opinion opponent opportunity opposite optical optimal orange orbit orchard orchestra ' +
    'organize origin ornate osprey outfit outlet outlook outside overall oxide oxygen oyster ' +
    'pacific package palace palette pamphlet panic panther paprika paragraph parallel parcel ' +
    'parent parka parlor parsley partner passage passion pastel pastry patient patriotic patrol ' +
    'pattern payment peaceful penalty pendant pension people pepper percent perfect perform ' +
    'perfume perhaps period permit person petite phantom phone phrase physics picnic ' +
    'picture pilgrim pioneer pipeline pistol pivotal placement plateau pleasant ' +
    'pleasant please pledge plenty pocket poetic pointer polite politics pollution ' +
    'ponder poplar popular portion portrait positive possess possible postpone pouch ' +
    'poverty powder practical precious predict premium prepare presence preserve pressure ' +
    'pretend pretty previous primary prince printer privacy probable problem proceed process ' +
    'produce product profile program project promise promote pronounce proof proper property ' +
    'prophet proposal prosper protect protein proud provide publish pupil pursue puzzle pyramid ' +
    'quantity quantum quarter question quicken quiet quiver quizzes radical railway rainbow ' +
    'rampart random ransom rapid rarity rather rating ravine reason rebel recipe recital reckon ' +
    'record recover recruit refine reflect reform refuge regard regime region register regret ' +
    'regular rehearse reject relate relief religion remain remark remedy remind remote remove ' +
    'render repair repeat replace report request rescue research resemble reserve resident ' +
    'resist resolve resource respect respond restore result resume retail retire return reveal ' +
    'revenue reverse review revive reward rhythm ribbon riddle rigid rinse ripple ritual rival ' +
    'roasted robust rocket romance rooftop rooster rotate roughly royal rubber ruining ruler ' +
    'rumble runner runway rustic sacred saddle safety sailor salmon sample sanction sanctuary ' +
    'satisfy saucepan saving scandal scarce scenery scholar science scissor sculpt seagull ' +
    'season second secret sector secure seldom select senate senior sensor sequence serene ' +
    'sermon serious servant session setting seven severe shadow shaken shimmer shrimp shrine ' +
    'silent silicon silence similar simple sire sixteen sketch skilled slogan smock smooth ' +
    'society softly sojourn soldier solicit solid solo somewhat soothing sorcery sound source ' +
    'sovereign spectacle spectrum spend sphere spider spiral spiritual splendid sponsor spoon ' +
    'sportive sprint square squash stability stable stagnant stain stake stand stardust startle ' +
    'station status steady stereo sticky stipend stir stop storied stately steward stone storage ' +
    'stories streak stream street stress strict stride strike studio style subject sublime ' +
    'subtle succeed sudden suffer sugar suggest suit summit sundial sunrise super supply support ' +
    'suppose supreme surface surgeon surplus survey survive suspect suspend sustain swagger ' +
    'sympathy synergy syntax system tableland tablet tactic taffeta talent tambour target tattoo ' +
    'taut tavern teamwork tedious telegram telescope temperate tempest tenant tender tennis ' +
    'tentative terrace territory texture thanks theory thermal thirty thorough though thread ' +
    'threat thrive throne thunder ticket tidal timber timely timid tissue titan toaster tobacco ' +
    'together tomato tonight topic torch tornado tortoise total touchy tour toward tower town ' +
    'toxic trace track tractor tradition traffic tragedy trailer train transit translate travel ' +
    'traverse treasury treat tremendous triathlon tribute trick trillion trio triumph trolley ' +
    'trophy tropic trouble trout truck true truly trumpet trunk trust truth tuba tulip tumble ' +
    'tundra tunnel turbulent twelve twenty twice twilight twist typical ultimate umbrella unable ' +
    'uncle uncover under underline understand unicorn uniform unify union unique unite unity ' +
    'universe unless unlike unrest until unusual upcoming update upgrade uphold upon upper ' +
    'upset urban urge urgent usage useful usher utility utmost utter vacant vacation vaccine ' +
    'vacuum valley valuable value vapor variable various vast vault vector vegetable vehicle ' +
    'velocity velvet vendor venture verbal verify versatile vessel veteran veto viable vibrant ' +
    'victory video view vigorous village vinegar vintage vinyl viola violate violet virtue ' +
    'vision visit visual vital vivid vocal volcano voltage volume volunteer voyage waffle wagon ' +
    'waist wander warmth warrior washer waste watch water wave weather webcam website wedding ' +
    'weekend weird welcome welfare western whale wharf wheat wheel whereas whisker whole wholesale ' +
    'wicked width wield wind window winner winter wisdom witness wizard wolf wonder wooden word ' +
    'workshop worry worth wound woven wrench wrestler wrist yacht yard yarn yearn yeast yellow ' +
    'yield yoga yogurt young youth zebra zen zigzag zipper zodiac zoom').split(/\s+/);

  /* Auto-bucket by REAL length (guards against hand-listing mistakes):
   * tier 0 = 3-4 letters, tier 1 = 5-6, tier 2 = 7-9. Duplicates collapse. */
  const seen = new Set(), buckets = [[], [], []];
  for (const w of T0.concat(T1, T2)) {
    if (!/^[a-z]+$/.test(w) || seen.has(w)) continue;
    const len = w.length;
    const t = len <= 4 ? 0 : len <= 6 ? 1 : len <= 9 ? 2 : -1;
    if (t < 0) continue; // too long to type in an arcade sprint
    seen.add(w);
    buckets[t].push(w);
  }
  const TIERS = buckets;

  /* deterministic RNG: xmur3 string hash + mulberry32 */
  function hashStr(s) {
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h >>> 0) || 1;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rngFor(seedStr) { return mulberry32(hashStr(String(seedStr))); }

  function utcDate(d) {
    const t = d ? new Date(d + 'T00:00:00Z') : new Date();
    return t.toISOString().slice(0, 10);
  }
  function dailySeed(dateStr) { return 'neon-typing:' + utcDate(dateStr); }

  /* Build the full word queue for a run. Weight shifts from short to long
   * words as the queue index grows = difficulty progression inside one run.
   * simple=true (mobile practice) keeps tier-0 words only. */
  function buildQueue(seedStr, simple) {
    const rnd = rngFor(seedStr);
    const N = 160, q = [];
    let last = '';
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1); // 0 -> 1
      let tier;
      if (simple) tier = 0;
      else {
        const w0 = Math.max(0.15, 1 - 1.6 * t), w1 = 0.5 + 0.6 * t, w2 = 1.15 * t;
        const r = rnd() * (w0 + w1 + w2);
        tier = r < w0 ? 0 : r < w0 + w1 ? 1 : 2;
      }
      const bank = TIERS[tier];
      let w = bank[Math.floor(rnd() * bank.length)];
      if (w === last) w = bank[Math.floor(rnd() * bank.length)];
      q.push(w);
      last = w;
    }
    return q;
  }

  return {
    TIERS, TIERSIZES: TIERS.map(a => a.length), TOTAL: TIERS.reduce((s, a) => s + a.length, 0),
    rngFor, utcDate, dailySeed, buildQueue,
  };
})();
