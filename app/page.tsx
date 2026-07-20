"use client";

import { useMemo, useState } from "react";

type Country = "cn" | "us" | "jp";
type StatKey = "health" | "happiness" | "ability" | "money" | "relations" | "stress";
type Stats = Record<StatKey, number>;

type Choice = {
  text: string;
  intent: string;
  effects: Partial<Stats>;
  fallback: string;
};

type LifeEvent = {
  age: number;
  chapter: string;
  title: string;
  scene: string;
  prompt: string;
  choices: Choice[];
  important?: boolean;
};

type HistoryItem = {
  age: number;
  title: string;
  choice: string;
  narrative: string;
};

const countries: Record<Country, { name: string; subtitle: string; glyph: string; places: string[] }> = {
  cn: { name: "中国", subtitle: "家庭、流动与选择", glyph: "中", places: ["成都近郊", "苏州老城区", "西安城南", "广西的一座小城"] },
  us: { name: "美国", subtitle: "独立、机会与代价", glyph: "US", places: ["俄勒冈州小镇", "芝加哥南郊", "亚利桑那州凤凰城", "缅因州海边"] },
  jp: { name: "日本", subtitle: "秩序、归属与自我", glyph: "日", places: ["大阪郊区", "札幌市内", "福冈近郊", "长野县小镇"] },
};

const names: Record<Country, string[]> = {
  cn: ["林知夏", "陈砚", "周遥", "沈禾"],
  us: ["Avery Chen", "Jordan Reed", "Maya Brooks", "Noah Park"],
  jp: ["佐藤遥", "高桥澪", "中村葵", "山本律"],
};

const sharedEvents: LifeEvent[] = [
  {
    age: 6,
    chapter: "童年",
    title: "窗外的世界",
    scene: "childhood",
    prompt: "开学后的第三周，老师让每个人在全班面前讲一件自己最喜欢的事。你握着画满奇怪城市的本子，手心全是汗。",
    choices: [
      { text: "走上讲台，展示自己的画", intent: "尝试表达自己", effects: { ability: 7, stress: 4, happiness: 3 }, fallback: "你的声音一开始很轻，后来却越来越稳。有人笑了，也有人在下课后问你能不能再画一座城市。你第一次发现，害怕和勇敢可以同时存在。" },
      { text: "只说一句，然后回到座位", intent: "保护自己的安全感", effects: { stress: -3, relations: 2 }, fallback: "你很快结束了发言。老师没有责备你，邻座悄悄推来一张纸条，上面画着一扇门。那份不动声色的善意被你记了很多年。" },
      { text: "假装忘记带作业", intent: "回避这次挑战", effects: { stress: -5, ability: -2 }, fallback: "你暂时躲过了讲台，但回家的路上一直想着那本没有被打开的画册。逃避带来了轻松，也留下了一点难以命名的遗憾。" },
    ],
  },
  {
    age: 12,
    chapter: "少年",
    title: "两个人的秘密",
    scene: "school",
    prompt: "你最好的朋友被同学排挤，并请求你不要告诉任何人。第二天，老师单独问你是否知道发生了什么。",
    choices: [
      { text: "告诉老师，但要求保护朋友", intent: "寻求成年人的帮助", effects: { relations: 5, stress: 3, ability: 3 }, fallback: "事情没有立刻变好，但老师开始留意那些被忽略的角落。朋友起初生你的气，几周后才明白你没有背叛。你们的关系从此多了一条不那么轻松的纽带。" },
      { text: "遵守承诺，什么也不说", intent: "保护朋友的秘密", effects: { relations: 3, stress: 7 }, fallback: "你守住了秘密，也开始每天注意朋友有没有独自回家。承担另一个人的痛苦让你显得更成熟，却也让你第一次感到无能为力。" },
      { text: "劝朋友一起去找老师", intent: "共同面对问题", effects: { relations: 8, stress: 2, ability: 2 }, fallback: "你们在办公室门口徘徊了很久，最后一起敲门。问题没有神奇地消失，但朋友记住了那天你没有替他决定，而是陪他做了决定。" },
    ],
  },
  {
    age: 18,
    chapter: "离巢",
    title: "一张通往远方的票",
    scene: "departure",
    prompt: "你得到一个离家很远的学习机会。它更接近你的兴趣，但费用不低，家人也希望你留在身边。",
    important: true,
    choices: [
      { text: "去远方，接受不确定性", intent: "追求独立和兴趣", effects: { money: -12, ability: 10, relations: -3, stress: 7, happiness: 5 }, fallback: "列车启动时，你同时感到自由和内疚。新城市没有为你准备欢迎仪式，但陌生的街道迫使你学习如何照顾自己。这次离开成为此后许多选择的起点。" },
      { text: "留下，选择更稳妥的道路", intent: "重视家庭和稳定", effects: { money: 4, relations: 9, stress: -2, happiness: -2 }, fallback: "家里的生活继续以熟悉的速度向前。你获得了支持，也偶尔在深夜想象另一条时间线。留下不是失败，只是它的代价通常不会立刻显现。" },
      { text: "工作一年，再决定", intent: "延迟决定并积累资源", effects: { money: 8, ability: 4, stress: 5 }, fallback: "你开始用自己的劳动换取选择的空间。一年可能让梦想更清晰，也可能让人习惯眼前的生活。你把那张录取通知书收进抽屉，没有丢掉。" },
    ],
  },
  {
    age: 27,
    chapter: "青年",
    title: "向上的电梯",
    scene: "city",
    prompt: "工作进入第四年，你得到一次明显的晋升机会，但新职位意味着更长工时，并可能需要离开现在的城市。",
    choices: [
      { text: "接受晋升，把握窗口", intent: "优先发展事业", effects: { money: 14, ability: 8, stress: 13, relations: -6 }, fallback: "你的名片换了职位，日历也迅速被填满。能力和收入都在增长，但一些原本随时能见的人，渐渐只出现在聊天列表里。" },
      { text: "拒绝，守住现在的生活", intent: "优先生活和关系", effects: { happiness: 7, relations: 7, stress: -8, money: -3 }, fallback: "同事有人不理解你的决定，你却重新拥有了完整的晚上。几个月后，偶尔的动摇仍会出现，但生活不再只剩下一条衡量尺度。" },
      { text: "提出条件，尝试重新谈判", intent: "寻找折中方案", effects: { ability: 6, money: 6, stress: 5, relations: 2 }, fallback: "谈判没有给你完美答案，却改变了别人看待你的方式。你得到部分空间，也承担了证明这套安排可行的压力。" },
    ],
  },
  {
    age: 39,
    chapter: "中途",
    title: "父母的来电",
    scene: "home",
    prompt: "一位年长的家人开始频繁忘事，需要有人投入更多时间照顾。与此同时，你自己的生活正处在关键阶段。",
    important: true,
    choices: [
      { text: "调整工作，承担主要照护", intent: "承担家庭责任", effects: { relations: 13, money: -10, stress: 12, health: -4 }, fallback: "你的生活半径突然缩小，日程被复诊、购物和反复的解释占满。爱没有让照护变得轻松，但一些过去来不及说的话，在缓慢的日子里重新出现。" },
      { text: "寻找专业帮助并共同分担", intent: "建立可持续的照护方案", effects: { money: -8, relations: 7, stress: 4, ability: 3 }, fallback: "你花了很长时间寻找合适的帮助，也面对了家人的犹豫。安排并不完美，却让每个人都保留了一点继续生活的空间。" },
      { text: "维持距离，优先保住自己的生活", intent: "保护个人边界", effects: { money: 5, stress: 2, relations: -14, happiness: -4 }, fallback: "现实没有因此停止运转，但家人之间出现了难以弥合的沉默。你守住了自己的节奏，也必须与复杂的愧疚共处。" },
    ],
  },
  {
    age: 54,
    chapter: "转身",
    title: "重新开始的可能",
    scene: "crossroads",
    prompt: "你熟悉的行业正在变化。继续留下仍能维持体面生活，但一个埋藏很久的兴趣再次出现。",
    choices: [
      { text: "从零开始，转向真正想做的事", intent: "晚年之前重新选择", effects: { money: -12, happiness: 14, ability: 5, stress: 7 }, fallback: "重新成为新手并不浪漫。你犯下年轻时不会犯的错误，却也拥有年轻时没有的耐心。收入下降了，早晨醒来时的重量却变轻了一些。" },
      { text: "保留工作，把兴趣留给周末", intent: "稳健地平衡风险", effects: { happiness: 7, stress: 2, ability: 3 }, fallback: "你没有推翻人生，而是在原有生活旁边开了一扇小门。门很窄，但足以让新的空气进来。" },
      { text: "继续原来的道路，为退休做准备", intent: "优先财务安全", effects: { money: 12, happiness: -3, stress: -2 }, fallback: "你选择把不确定性留在门外。账户数字让未来更安稳，那个兴趣偶尔仍会在安静的周末敲门。" },
    ],
  },
  {
    age: 68,
    chapter: "晚年",
    title: "空出来的日历",
    scene: "late-life",
    prompt: "正式离开主要工作后，你第一次拥有大段没有安排的时间。身体仍允许你做很多事，但精力已不像从前。",
    choices: [
      { text: "去看一直想看的世界", intent: "完成未竟愿望", effects: { money: -12, happiness: 12, health: -2 }, fallback: "旅途比想象中更累，你却在陌生车站重新感到年轻。真正留下来的不是照片数量，而是你终于不再把愿望推给未来。" },
      { text: "留在社区，把经验教给年轻人", intent: "建立代际连接", effects: { relations: 13, happiness: 8, ability: 2 }, fallback: "一开始只有几个人来，后来每周都有人提前等你。你发现经验的价值，不在于证明自己走得多远，而在于能否为别人照亮一小段路。" },
      { text: "安静生活，重新整理自己的一生", intent: "向内回望", effects: { stress: -12, happiness: 5, relations: -2 }, fallback: "你开始整理旧物，也整理那些没有结论的往事。有些遗憾仍然是遗憾，但不再需要每次想起都与它争辩。" },
    ],
  },
  {
    age: 82,
    chapter: "余晖",
    title: "最后一封信",
    scene: "sunset",
    prompt: "医生说你的身体正在缓慢衰退。一个晴朗的下午，你决定留下一封信，给家人、朋友，或年轻时的自己。",
    important: true,
    choices: [
      { text: "写给最重要的人：谢谢你", intent: "表达感谢和连接", effects: { relations: 12, happiness: 9, stress: -8 }, fallback: "你没有写很多大道理，只写下几个具体的下午、几顿饭和一次争吵后的拥抱。信被折好时，你发现所谓一生，最终常常被记作这些微小的时刻。" },
      { text: "写给年轻的自己：你不必那么害怕", intent: "与过去和解", effects: { happiness: 11, stress: -12 }, fallback: "你写下那些当时没人告诉你的话。它无法改变过去，却让过去第一次停止追赶你。窗外的光移动得很慢，你也不再催促它。" },
      { text: "不写信，请大家来吃一顿饭", intent: "用陪伴代替告别", effects: { relations: 15, health: -2, happiness: 8 }, fallback: "桌上很吵，有人讲错了旧事，也有人偷偷擦眼泪。你没有发表告别，只让每个人再添了一次菜。那顿饭后来被记了很多年。" },
    ],
  },
];

const countryEvent: Record<Country, LifeEvent> = {
  cn: {
    age: 23, chapter: "初入社会", title: "留下，还是回去", scene: "station", important: true,
    prompt: "毕业后，你在大城市得到一份起薪普通但有成长空间的工作。房租会占去近一半收入；家乡也有一份稳定工作，父母希望你回来。",
    choices: [
      { text: "留在大城市试三年", intent: "追求职业机会", effects: { money: -5, ability: 10, stress: 11, relations: -4 }, fallback: "你租下一间很小的房间，把三年写在便签上。城市没有承诺回报你的努力，但它给了你接触更大世界的机会。" },
      { text: "回家乡，靠近家人", intent: "选择稳定和家庭", effects: { money: 7, relations: 11, stress: -5, happiness: 4 }, fallback: "熟悉的街道让生活成本和孤独都下降了。你偶尔担心自己错过什么，也逐渐发现留下同样需要勇气。" },
      { text: "去另一座成本较低的城市", intent: "寻找第三条道路", effects: { ability: 6, money: 2, stress: 5, happiness: 3 }, fallback: "你没有选择最耀眼或最熟悉的答案。新的城市给了你喘息空间，也要求你重新建立一切。" },
    ],
  },
  us: {
    age: 23, chapter: "初入社会", title: "账单与机会", scene: "station", important: true,
    prompt: "毕业后，你拿到一份外州工作的邀请。薪水更高，但你还有学生贷款，并且需要离开熟悉的支持网络。",
    choices: [
      { text: "搬去外州，优先偿还贷款", intent: "追求收入和独立", effects: { money: 10, ability: 7, stress: 9, relations: -6 }, fallback: "第一份工资让数字开始朝正确方向移动，但新城市的孤独无法被电子账单显示。你学会了把自由和责任一起计算。" },
      { text: "留在本地，接受较低薪水", intent: "保留支持网络", effects: { money: -3, relations: 10, stress: -3, happiness: 5 }, fallback: "你没有选择简历上最好看的答案。熟悉的人让一些艰难的月份变得可承受，而贷款仍在提醒你这份选择的价格。" },
      { text: "与雇主谈远程和搬迁补助", intent: "主动谈判条件", effects: { money: 5, ability: 8, stress: 4 }, fallback: "你第一次把自己的处境摆上谈判桌。没有得到全部要求，但获得了几个月缓冲，也建立起一种不再被动接受条件的习惯。" },
    ],
  },
  jp: {
    age: 23, chapter: "初入社会", title: "春天的内定", scene: "station", important: true,
    prompt: "你得到一家东京公司的录用通知。它稳定、体面，却与你真正喜欢的方向不同；大阪的小团队愿意给你机会，但未来并不确定。",
    choices: [
      { text: "进入东京的大公司", intent: "选择稳定和主流路径", effects: { money: 9, ability: 6, stress: 11, relations: -5 }, fallback: "四月，你穿着新西装挤进早高峰。稳定带来了安心，也让一天的边界变得模糊。你开始学习在集体期待里保存一点自己。" },
      { text: "加入大阪的小团队", intent: "选择兴趣和不确定性", effects: { money: -5, happiness: 10, ability: 9, stress: 6 }, fallback: "办公室比想象中更小，很多制度都还不存在。你承担了更多风险，也更清楚每天的工作为什么与你有关。" },
      { text: "暂缓决定，做一年自由职业", intent: "探索不同道路", effects: { ability: 7, money: -7, stress: 8, happiness: 4 }, fallback: "没有固定名片让一些亲戚担心，但你第一次用自己的节奏安排时间。不稳定是真实的，获得的视野也是真实。" },
    ],
  },
};

const statMeta: Record<StatKey, { label: string; icon: string; positive: boolean }> = {
  health: { label: "健康", icon: "✦", positive: true },
  happiness: { label: "心境", icon: "☼", positive: true },
  ability: { label: "能力", icon: "⌁", positive: true },
  money: { label: "资源", icon: "◈", positive: true },
  relations: { label: "关系", icon: "∞", positive: true },
  stress: { label: "压力", icon: "≈", positive: false },
};

const initialStats: Stats = { health: 78, happiness: 64, ability: 42, money: 38, relations: 62, stress: 24 };

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hash(seed: string) {
  return [...seed].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function makeProfile(country: Country, playerName: string) {
  const seed = hash(`${country}-${playerName || Date.now()}`);
  const countryInfo = countries[country];
  const generatedName = playerName.trim() || names[country][seed % names[country].length];
  const place = countryInfo.places[(seed >> 3) % countryInfo.places.length];
  const family = ["经济普通，家人关系亲密", "生活并不宽裕，但家中重视教育", "物质条件不错，家庭期待也很高", "由一位家长和祖辈共同照顾"][(seed >> 5) % 4];
  const trait = ["敏感而好奇", "安静但意志坚定", "外向，容易相信别人", "谨慎，擅长观察"][(seed >> 7) % 4];
  return { name: generatedName, place, family, trait, birthYear: 2004 };
}

export default function Home() {
  const [screen, setScreen] = useState<"intro" | "game" | "end">("intro");
  const [country, setCountry] = useState<Country>("cn");
  const [nameInput, setNameInput] = useState("");
  const [profile, setProfile] = useState(() => makeProfile("cn", ""));
  const [stats, setStats] = useState<Stats>(initialStats);
  const [eventIndex, setEventIndex] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [result, setResult] = useState<{ title: string; narrative: string; effects: Partial<Stats>; live: boolean } | null>(null);
  const [pendingChoice, setPendingChoice] = useState("");
  const [thinking, setThinking] = useState(false);
  const [artUrl, setArtUrl] = useState<string | null>(null);
  const [artLoading, setArtLoading] = useState(false);

  const events = useMemo(() => {
    const combined = [...sharedEvents, countryEvent[country]];
    return combined.sort((a, b) => a.age - b.age);
  }, [country]);
  const currentEvent = events[eventIndex];

  function startLife() {
    setProfile(makeProfile(country, nameInput));
    setStats(initialStats);
    setHistory([]);
    setEventIndex(0);
    setResult(null);
    setArtUrl(null);
    setScreen("game");
  }

  async function choose(choice: Choice) {
    if (thinking || result) return;
    setThinking(true);
    setPendingChoice(choice.text);
    setArtUrl(null);
    try {
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: countries[country].name, profile, stats, history, event: currentEvent, choice }),
      });
      const data = await response.json();
      setResult({
        title: data.title || currentEvent.title,
        narrative: data.narrative || choice.fallback,
        effects: data.effects || choice.effects,
        live: Boolean(data.live),
      });
    } catch {
      setResult({ title: currentEvent.title, narrative: choice.fallback, effects: choice.effects, live: false });
    } finally {
      setThinking(false);
    }
  }

  async function createArt() {
    if (!result || artLoading) return;
    setArtLoading(true);
    try {
      const response = await fetch("/api/illustrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, country: countries[country].name, age: currentEvent.age, scene: currentEvent.scene, narrative: result.narrative }),
      });
      const data = await response.json();
      if (data.image) setArtUrl(data.image);
    } finally {
      setArtLoading(false);
    }
  }

  function continueLife() {
    if (!result) return;
    const choiceText = pendingChoice || "做出了选择";
    const nextStats = { ...stats };
    (Object.keys(result.effects) as StatKey[]).forEach((key) => {
      const delta = Math.max(-18, Math.min(18, Number(result.effects[key] || 0)));
      nextStats[key] = clamp(nextStats[key] + delta);
    });
    setStats(nextStats);
    setHistory((items) => [...items, { age: currentEvent.age, title: result.title, choice: choiceText, narrative: result.narrative }]);
    setResult(null);
    setPendingChoice("");
    setArtUrl(null);
    if (eventIndex >= events.length - 1) setScreen("end");
    else setEventIndex((index) => index + 1);
  }

  function restart() {
    setNameInput("");
    setScreen("intro");
    setResult(null);
    setHistory([]);
  }

  if (screen === "intro") {
    return (
      <main className="intro-shell">
        <div className="grain" />
        <nav className="topbar"><span className="brand-mark">一</span><span>这一生</span><span className="edition">BUILD WEEK · PROTOTYPE</span></nav>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">ONE ORDINARY, IRREPEATABLE LIFE</p>
            <h1>如果人生<br />可以重来一次</h1>
            <p className="hero-lead">你无法选择出生，但每一次决定都会留下痕迹。一个由 AI 推演结果的现实主义人生模拟器。</p>
            <div className="premise"><span>✦</span><p>没有标准答案。财富、爱、遗憾与时间，共同组成这一生。</p></div>
          </div>
          <div className="birth-card">
            <div className="card-heading"><span>01</span><div><strong>选择出生地</strong><small>CHOOSE A BEGINNING</small></div></div>
            <div className="country-grid">
              {(Object.keys(countries) as Country[]).map((key) => (
                <button key={key} className={`country-card ${country === key ? "selected" : ""}`} onClick={() => setCountry(key)}>
                  <span className="country-glyph">{countries[key].glyph}</span>
                  <strong>{countries[key].name}</strong>
                  <small>{countries[key].subtitle}</small>
                </button>
              ))}
            </div>
            <label className="name-field"><span>名字 <small>可留空随机生成</small></span><input value={nameInput} onChange={(event) => setNameInput(event.target.value)} placeholder="这一生，我叫……" /></label>
            <button className="primary-button" onClick={startLife}><span>开始这一生</span><b>→</b></button>
            <p className="privacy-note">这是一场叙事模拟，而不是对真实人生的预测。</p>
          </div>
        </section>
        <footer className="intro-footer"><span>出生</span><i /><span>成长</span><i /><span>选择</span><i /><span>告别</span></footer>
      </main>
    );
  }

  if (screen === "end") {
    const years = 82;
    const brightest = [...history].sort((a, b) => b.narrative.length - a.narrative.length)[0];
    return (
      <main className="end-shell">
        <div className="grain" />
        <div className="end-card">
          <p className="eyebrow">A LIFE, REMEMBERED</p>
          <h1>{profile.name}</h1>
          <p className="lifespan">{profile.birthYear} — {profile.birthYear + years}</p>
          <div className="epitaph">“{profile.name}曾经害怕许多尚未发生的事，也在真正到来时，比自己想象得更勇敢。人生没有成为计划中的样子，却留下了只属于自己的纹路。”</div>
          <div className="life-summary">
            <div><small>走过</small><strong>{years} 年</strong></div>
            <div><small>重要选择</small><strong>{history.length} 次</strong></div>
            <div><small>最后的心境</small><strong>{stats.happiness >= 65 ? "安宁" : stats.happiness >= 45 ? "复杂" : "仍有牵挂"}</strong></div>
          </div>
          {brightest && <p className="remembered"><span>最清晰的记忆</span>{brightest.age}岁，{brightest.title}。{brightest.narrative}</p>}
          <div className="mini-timeline">{history.map((item) => <div key={`${item.age}-${item.title}`}><b>{item.age}</b><span>{item.title}</span></div>)}</div>
          <button className="primary-button" onClick={restart}><span>再活一次</span><b>↻</b></button>
        </div>
      </main>
    );
  }

  return (
    <main className={`game-shell scene-${currentEvent.scene}`}>
      <div className="grain" />
      <header className="game-header">
        <button className="wordmark" onClick={restart}><span className="brand-mark">一</span><b>这一生</b></button>
        <div className="life-progress"><span style={{ width: `${((eventIndex + 1) / events.length) * 100}%` }} /></div>
        <div className="age-stamp"><small>{currentEvent.chapter}</small><strong>{currentEvent.age}<i>岁</i></strong></div>
      </header>

      <section className="game-layout">
        <aside className="identity-panel">
          <p className="panel-kicker">你的这一生</p>
          <h2>{profile.name}</h2>
          <p>{profile.birthYear}年生于{profile.place}</p>
          <div className="profile-facts"><span>{profile.trait}</span><span>{profile.family}</span></div>
          <div className="stats">
            {(Object.keys(statMeta) as StatKey[]).map((key) => (
              <div className="stat" key={key}>
                <div><span>{statMeta[key].icon} {statMeta[key].label}</span><b>{stats[key]}</b></div>
                <i><em style={{ width: `${stats[key]}%` }} /></i>
              </div>
            ))}
          </div>
          <div className="past"><span>已经走过</span><strong>{history.length} 个转折</strong></div>
        </aside>

        <section className="story-panel">
          <div className={`memory-canvas ${artUrl ? "has-art" : ""}`}>
            {artUrl ? <img src={artUrl} alt={`${profile.name}${currentEvent.age}岁时的人生场景`} /> : <><div className="sun" /><div className="horizon" /><div className="figure" /><p>{currentEvent.chapter}</p></>}
          </div>
          <div className="story-content">
            <p className="chapter-label">第 {String(eventIndex + 1).padStart(2, "0")} 章 · {currentEvent.chapter}</p>
            <h1>{result ? result.title : currentEvent.title}</h1>
            {!result && !thinking && <p className="event-copy">{currentEvent.prompt}</p>}

            {thinking && (
              <div className="thinking-card">
                <div className="thinking-orbit"><span /><span /><span /></div>
                <div><strong>人生导演正在推演</strong><p>读取过去的选择 · 衡量现实条件 · 寻找可能的结果</p></div>
              </div>
            )}

            {result && (
              <div className="result-block">
                <div className="director-line"><span>{result.live ? "AI 实时推演" : "本地导演模式"}</span><i /></div>
                <p>{result.narrative}</p>
                <div className="effect-row">
                  {(Object.entries(result.effects) as [StatKey, number][]).filter(([, value]) => value !== 0).map(([key, value]) => (
                    <span className={value > 0 === statMeta[key].positive ? "good" : "hard"} key={key}>{statMeta[key].label} {value > 0 ? "+" : ""}{value}</span>
                  ))}
                </div>
                {currentEvent.important && <button className="art-button" onClick={createArt} disabled={artLoading || Boolean(artUrl)}><span>{artLoading ? "正在描绘这一刻…" : artUrl ? "这一刻已被留下" : "◌ 生成这一刻的画面"}</span></button>}
                <button className="continue-button" onClick={continueLife}>继续向前 <span>→</span></button>
              </div>
            )}

            {!result && !thinking && (
              <div className="choices">
                <p>你会怎么选择？</p>
                {currentEvent.choices.map((choice, index) => (
                  <button key={choice.text} onClick={() => choose(choice)}><span>{String.fromCharCode(65 + index)}</span><strong>{choice.text}</strong><i>→</i></button>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
