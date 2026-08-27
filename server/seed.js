import { getDb, saveDb } from './db.js'
import bcrypt from 'bcryptjs'

function addDays(base, n) {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const P = (file) => `https://assets.voxcinemas.com/posters/${file}`

export async function seed(force = false) {
  const db = getDb()
  if (db.movies.length && !force) {
    console.log('Database already seeded. Use `npm run seed -- --force` to reseed.')
    return
  }

  const nowShowing = [
    {
      title: { en: 'Spider-Man: Brand New Day', ar: 'سبايدرمان: يوم جديد كلياً' },
      lang: 'en',
      description: {
        en: 'It is a BRAND NEW DAY for Peter Parker. Fighting crime full-time as Spider-Man in a world that does not remember him, a powerful villain no one can even see threatens everything he loves.',
        ar: 'إنه يوم جديد كلياً لبيتر باركر. يقاتل الجريمة بدوام كامل كسبايدرمان في عالم لا يتذكره، بينما يهدد شرير قوي لا يستطيع أحد رؤيته كل ما يحبه.'
      },
      genre: { en: 'Action', ar: 'أكشن' },
      duration: 125,
      rating: 8.2,
      ageRating: '12+',
      status: 'now_showing',
      cast: ['Tom Holland', 'Zendaya', 'Peter Parker'],
      poster: P('P_HO00013065_1782227665332.jpg'),
      featured: true
    },
    {
      title: { en: 'The Odyssey', ar: 'الأوديسة' },
      lang: 'en',
      description: {
        en: 'Christopher Nolan\'s mythic action epic shot across the world using brand new IMAX film technology, bringing Homer\'s foundational saga to the big screen.',
        ar: 'ملحمة كريستوفر نولان الأسطورية المصورة حول العالم بتقنية IMAX الجديدة، ليعيد سرد ملحمة هوميروس الملحمية على الشاشة الكبيرة.'
      },
      genre: { en: 'Adventure', ar: 'مغامرة' },
      duration: 165,
      rating: 8.8,
      ageRating: '16+',
      status: 'now_showing',
      cast: ['Matt Damon', 'Tom Holland', 'Anne Hathaway', 'Robert Pattinson', 'Zendaya'],
      poster: P('P_HO00013488_1783655908489.jpg'),
      featured: true
    },
    {
      title: { en: 'Khali Balak Min Nafsik', ar: 'خلي بالك من نفسك' },
      lang: 'ar',
      description: {
        en: 'The story revolves around a couple who face numerous recurring disagreements and problems, leading them to a series of humorous and unexpected situations.',
        ar: 'تدور القصة حول زوجين يواجهان خلافات ومشاكل متكررة، تقودهما إلى سلسلة من المواقف الطريفة وغير المتوقعة.'
      },
      genre: { en: 'Comedy', ar: 'كوميدي' },
      duration: 100,
      rating: 7.4,
      ageRating: '12+',
      status: 'now_showing',
      cast: ['Ahmed Helmy', 'Mona Zaki'],
      poster: P('P_HO00013487_1784268069506.jpg')
    },
    {
      title: { en: 'Sakr w Canaria', ar: 'صقر وكنارية' },
      lang: 'ar',
      description: {
        en: 'Saqr, a legendary mercenary, decides to leave his dangerous double life behind. An unexpected encounter with Bilal, a failed writer obsessed with espionage, turns his plans upside down.',
        ar: 'يقرر صقر، المرتزق الأسطوري، ترك حياته المزدوجة الخطرة خلفه. لكن لقاءً غير متوقع مع بلال، الكاتب الفاشل المهووس بالجاسوسية، يقلب خططه رأساً على عقب.'
      },
      genre: { en: 'Action', ar: 'أكشن' },
      duration: 110,
      rating: 7.1,
      ageRating: '16+',
      status: 'now_showing',
      cast: ['Karim Abdel Aziz', 'Khaled El Sawy'],
      poster: P('P_HO00013172_1780326269681.jpg')
    },
    {
      title: { en: 'Shamshoun w Dalila', ar: 'شمشون ودليلة' },
      lang: 'ar',
      description: {
        en: 'Samson is forced to steal a legendary diamond to rescue his kidnapped sister, while Delilah is mysteriously tasked with stealing it for herself. Their missions intersect in a chase filled with tricks and clever confrontations.',
        ar: 'يضطر شمشون لسرقة ماسة أسطورية لإنقاذ أخته المختطفة، بينما تكلف دليلة بسرقتها لنفسها. تتصادم مهماتهما في مطاردة مليئة بالحيل والمواجهات الذكية.'
      },
      genre: { en: 'Comedy', ar: 'كوميدي' },
      duration: 115,
      rating: 6.9,
      ageRating: '12+',
      status: 'now_showing',
      cast: ['Mohamed Ramadan', 'Donia Samir Ghanem'],
      poster: P('P_HO00013485_1784547537084.jpg')
    },
    {
      title: { en: '7 Dogs', ar: '7dogs' },
      lang: 'ar',
      description: {
        en: 'Interpol officer Khalid Al-Azzazi captures a senior member of a covert global crime syndicate known as "7 Dogs". When the organization resurfaces trafficking a new drug, Khalid is forced into an uneasy alliance.',
        ar: 'يلقي ضابط الإنتربول خالد العزازي القبض على عضو بارز في شبكة إجرامية عالمية تُعرف باسم "7 كلاب". وعندما تعود المنظمة لتظهر مجدداً، يضطر خالد إلى تحالف صعب.'
      },
      genre: { en: 'Action', ar: 'أكشن' },
      duration: 120,
      rating: 7.3,
      ageRating: '16+',
      status: 'now_showing',
      cast: ['Ahmed Ezz', 'Mohamed Mamdouh'],
      poster: P('P_HO00013128_1778076059712.jpg')
    },
    {
      title: { en: 'Toy Story 5', ar: 'حكاية لعبة 5' },
      lang: 'en',
      description: {
        en: 'Woody, Buzz, Jessie and the rest of the gang\'s jobs are challenged when they are introduced to electronics, a new threat to playtime.',
        ar: 'تواجه وودي وباز وجيسي وباقي المجموعة تحدياً جديداً عندما يواجهون الأجهزة الإلكترونية، الخطر الجديد على وقت اللعب.'
      },
      genre: { en: 'Animation', ar: 'أنيميشن' },
      duration: 100,
      rating: 7.8,
      ageRating: 'PG',
      status: 'now_showing',
      cast: ['Tom Hanks', 'Tim Allen', 'Annie Potts'],
      poster: P('P_HO00013301_1783436274673.jpg')
    },
    {
      title: { en: 'Moana', ar: 'موانا' },
      lang: 'en',
      description: {
        en: 'Live-action adaptation of the 2016 Disney animated film Moana.',
        ar: 'النسخة الواقعية من فيلم ديزني الكرتوني الشهير موانا الصادر عام 2016.'
      },
      genre: { en: 'Animation', ar: 'أنيميشن' },
      duration: 105,
      rating: 7.5,
      ageRating: 'PG',
      status: 'now_showing',
      cast: ['Catherine Laga\'aia', 'Dwayne Johnson'],
      poster: P('P_HO00013063_1775409671373.jpg')
    },
    {
      title: { en: 'Visa', ar: 'فيزا' },
      lang: 'ar',
      description: {
        en: 'Four young Egyptians start their careers in marketing until a businessman persuades them to invest in a new digital currency and then defrauds them and escapes to America.',
        ar: 'يبدأ أربعة شباب مصريين حياتهم المهنية في التسويق حتى يقنعهم رجل أعمال بالاستثمار في عملة رقمية جديدة، ثم يخدعهم ويهرب بأموالهم إلى أمريكا.'
      },
      genre: { en: 'Comedy', ar: 'كوميدي' },
      duration: 100,
      rating: 7.0,
      ageRating: 'G',
      status: 'now_showing',
      cast: ['Mohamed Ezz', 'Reham Abdelghafour'],
      poster: P('P_HO00013535_1785317447444.jpg')
    },
    {
      title: { en: 'El Gawahergy', ar: 'الجواهرجي' },
      lang: 'ar',
      description: {
        en: 'Seif, a famous jeweler with a weakness for women, is forced to put his male pride aside when his strong-willed wife insists on building a healthier relationship.',
        ar: 'يضطر سيف، الجواهرجي الشهير، إلى وضع كبريائه جانباً عندما تصر زوجته القوية على بناء علاقة أكثر صحة وتوازناً.'
      },
      genre: { en: 'Comedy', ar: 'كوميدي' },
      duration: 110,
      rating: 6.8,
      ageRating: 'G',
      status: 'now_showing',
      cast: ['Mohamed Henedy', 'Mona Zaki', 'Leb Leba'],
      poster: P('P_HO00012991_1784647227553.jpg')
    }
  ]

  const comingSoon = [
    {
      title: { en: 'Avengers: Doomsday', ar: 'المنتقمون: يوم القيامة' },
      lang: 'en',
      description: {
        en: 'Heroes from three different worlds must unite when they are thrust together to confront a catastrophic danger that could destroy everything they know.',
        ar: 'يجب على أبطال من ثلاثة عوالم مختلفة أن يتحدوا عندما يواجهون خطراً كارثياً قد يدمر كل ما يعرفونه.'
      },
      genre: { en: 'Action', ar: 'أكشن' },
      duration: 180,
      rating: 8.5,
      ageRating: 'PG-13',
      status: 'coming_soon',
      cast: ['Chris Hemsworth', 'Robert Downey Jr', 'Chris Evans', 'Pedro Pascal'],
      poster: P('P_HO00013527_1784878779866.jpg'),
      featured: true
    },
    {
      title: { en: 'The Get Out', ar: 'الخروج' },
      lang: 'en',
      description: {
        en: 'A nightclub owner on the verge of retiring finds himself squeezed by ruthless cartels and must navigate a deadly web of deception, power and survival.',
        ar: 'يمتلك صاحب ملهى ليلي على وشك التقاعد نفسه محاصراً بين الكارتلات القاسية، وعليه اجتياز شبكة مميتة من الخداع والقوة والبقاء.'
      },
      genre: { en: 'Action', ar: 'أكشن' },
      duration: 110,
      rating: 7.2,
      ageRating: '18+',
      status: 'coming_soon',
      cast: ['Russell Crowe', 'Aaron Paul', 'Luke Evans'],
      poster: P('P_HO00013360_1784878700095.jpg')
    },
    {
      title: { en: 'Ice Cream Man', ar: 'رجل الآيس كريم' },
      lang: 'en',
      description: {
        en: 'An idyllic summer town descends into madness when an ice cream man serves kids sweet delights with horrifying results.',
        ar: 'تنزلق بلدة صيفية هادئة إلى الجنون عندما يقدم رجل الآيس كريم للأطفال حلويات بنتائج مرعبة.'
      },
      genre: { en: 'Horror', ar: 'رعب' },
      duration: 100,
      rating: 6.6,
      ageRating: '18+',
      status: 'coming_soon',
      cast: ['Eli Roth', 'Ari Millen'],
      poster: P('P_HO00013340_1782227995321.jpg')
    },
    {
      title: { en: 'Paw Patrol: The Dino Movie', ar: 'فريق باو: فيلم الديناصورات' },
      lang: 'en',
      description: {
        en: 'After their ship gets caught in a mysterious storm, the PAW Patrol pups crash land on an uncharted tropical island filled with dinosaurs.',
        ar: 'بعد أن تعلق سفينتهم في عاصفة غامضة، تهبط فرقة باو باترول على جزيرة استوائية مجهولة مليئة بالديناصورات.'
      },
      genre: { en: 'Animation', ar: 'أنيميشن' },
      duration: 95,
      rating: 7.0,
      ageRating: 'PG',
      status: 'coming_soon',
      cast: ['McKenna Grace', 'Terry Crews'],
      poster: P('P_HO00013061_1775409765636.jpg')
    },
    {
      title: { en: 'Insidious: Out Of The Further', ar: 'سطوة: خارج الفيرذر' },
      lang: 'en',
      description: {
        en: 'A young mother discovers she can travel into The Further, the purgatorial realm at the heart of the Insidious universe. Once the demons realize her power, our world becomes their playground.',
        ar: 'تكتشف أم شابة أنها تستطيع السفر إلى "الفيرذر"، عالم الأرواح في قلب سلسلة سطوة. وعندما تدرك الشياطين قوتها، يصبح عالمنا ملعباً لها.'
      },
      genre: { en: 'Horror', ar: 'رعب' },
      duration: 110,
      rating: 7.4,
      ageRating: '18+',
      status: 'coming_soon',
      cast: ['Amelia Eve', 'Brandon Perea'],
      poster: P('P_HO00013153_1779080015029.jpg')
    },
    {
      title: { en: 'El Set Lamma', ar: 'الست لمة' },
      lang: 'ar',
      description: {
        en: 'A media activist launches a campaign titled "Women Have the Right to Veto" to combat violence against women, in a social comedy full of humor and conflict.',
        ar: 'تطلق ناشطة إعلامية حملة بعنوان "الست ليها حق الفيتو" لمكافحة العنف ضد المرأة، في كوميديا اجتماعية مليئة بالكوميديا والصراعات.'
      },
      genre: { en: 'Comedy', ar: 'كوميدي' },
      duration: 115,
      rating: 6.7,
      ageRating: 'PG',
      status: 'coming_soon',
      cast: ['Yousra', 'Yasmine Raeis', 'Dorra'],
      poster: P('P_HO00013514_1784268107226.jpg')
    }
  ]

  const colors = [
    ['#6d28d9', '#ec4899'],
    ['#1e3a8a', '#22d3ee'],
    ['#7c2d12', '#ef4444'],
    ['#4a044e', '#a855f7'],
    ['#164e63', '#f97316'],
    ['#052e16', '#84cc16'],
    ['#312e81', '#fb7185'],
    ['#3b0764', '#38bdf8'],
    ['#450a0a', '#fbbf24'],
    ['#134e4a', '#4ade80']
  ]

  const movies = [...nowShowing, ...comingSoon].map((m, i) => ({
    id: `m${i + 1}`,
    gradient: colors[i % colors.length],
    ...m
  }))
  db.movies = movies
  db.nextIds.movie = movies.length + 1

  // halls with different sizes
  const hallsConfig = [
    { id: '1', name: '1', rows: 8, cols: 12, vipRows: ['A'], capacity: 96 },
    { id: '2', name: '2', rows: 6, cols: 10, vipRows: ['A'], capacity: 60 },
    { id: '3', name: '3', rows: 10, cols: 14, vipRows: ['A', 'B'], capacity: 140 },
    { id: '4', name: '4', rows: 7, cols: 12, vipRows: ['A'], capacity: 84 }
  ]
  db.halls = hallsConfig
  const halls = hallsConfig.map((h) => h.id)
  const formats = ['2D', '3D', 'IMAX']
  const times = ['12:00', '15:30', '18:45', '21:30', '23:59']
  const priceByFormat = { '2D': 100, '3D': 120, 'IMAX': 150 }

  db.showtimes = []
  db.nextIds.showtime = 1
  let stId = 1
  const now = new Date()
  for (const movie of db.movies.filter((m) => m.status === 'now_showing')) {
    for (let day = 0; day < 5; day++) {
      const date = addDays(now, day)
      const count = 5
      for (let t = 0; t < count; t++) {
        const time = times[(day + t) % times.length]
        const hall = halls[stId % halls.length]
        const format = formats[stId % formats.length]
        db.showtimes.push({
          id: `st${stId++}`,
          movieId: movie.id,
          date,
          time,
          hall,
          format,
          price: priceByFormat[format] || 100
        })
      }
    }
  }
  db.nextIds.showtime = stId

  db.bookings = []
  db.nextIds.booking = 1
  db.users = []
  db.nextIds.user = 1

  const adminHash = await bcrypt.hash('123', 10)
  const userHash = await bcrypt.hash('user123', 10)
  db.users = [
    {
      id: 1,
      name: 'Future_Admin',
      email: 'future_admin',
      password: adminHash,
      role: 'admin',
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Demo User',
      email: 'user@seawaysuez.com',
      password: userHash,
      role: 'user',
      createdAt: new Date().toISOString()
    }
  ]
  db.nextIds.user = 3

  saveDb()
  console.log(`Seeded ${db.movies.length} movies and ${db.showtimes.length} showtimes.`)
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed(process.argv.includes('--force')).then(() => process.exit(0))
}
