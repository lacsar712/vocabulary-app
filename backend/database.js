const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./data/vocab.db', (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// frequency: 使用频率 (1-10, 10为最常用)
// difficulty_level: 难度等级 (1=基础, 2=初级, 3=中级, 4=中高级, 5=高级, 6=专业)
const wordList = [
    // 基础词汇 (difficulty_level: 1, rank: 100-500)
    { word: "apple", pronunciation: "/ˈæpəl/", pos: "n.", definition: "苹果", example: "She ate an apple for lunch.", rank: 100, frequency: 10, difficulty_level: 1 },
    { word: "book", pronunciation: "/bʊk/", pos: "n.", definition: "书，书籍", example: "I read a book about history.", rank: 150, frequency: 10, difficulty_level: 1 },
    { word: "cat", pronunciation: "/kæt/", pos: "n.", definition: "猫", example: "The cat sat on the mat.", rank: 120, frequency: 10, difficulty_level: 1 },
    { word: "dog", pronunciation: "/dɒɡ/", pos: "n.", definition: "狗", example: "We could hear a dog barking.", rank: 130, frequency: 10, difficulty_level: 1 },
    { word: "eat", pronunciation: "/iːt/", pos: "v.", definition: "吃", example: "Do you want to eat lunch now?", rank: 200, frequency: 10, difficulty_level: 1 },
    { word: "water", pronunciation: "/ˈwɔːtər/", pos: "n.", definition: "水", example: "I need a glass of water.", rank: 180, frequency: 10, difficulty_level: 1 },
    { word: "house", pronunciation: "/haʊs/", pos: "n.", definition: "房子", example: "They live in a big house.", rank: 220, frequency: 10, difficulty_level: 1 },
    { word: "time", pronunciation: "/taɪm/", pos: "n.", definition: "时间", example: "What time is it?", rank: 250, frequency: 10, difficulty_level: 1 },

    // 初级词汇 (difficulty_level: 2, rank: 500-1500)
    { word: "ability", pronunciation: "/əˈbɪləti/", pos: "n.", definition: "做某事所需的身体或脑力；能力", example: "She had the ability to explain things clearly.", rank: 500, frequency: 9, difficulty_level: 2 },
    { word: "abandon", pronunciation: "/əˈbændən/", pos: "v.", definition: "永远离开某地、某人或某物；抛弃", example: "We had to abandon the car.", rank: 1100, frequency: 7, difficulty_level: 2 },
    { word: "absence", pronunciation: "/ˈæbsəns/", pos: "n.", definition: "缺席；不在场", example: "A new manager was appointed during her absence.", rank: 1200, frequency: 7, difficulty_level: 2 },
    { word: "absolute", pronunciation: "/ˈæbsəluːt/", pos: "adj.", definition: "完全的；绝对的", example: "I have absolute faith in her judgment.", rank: 1300, frequency: 7, difficulty_level: 2 },
    { word: "academic", pronunciation: "/ˌækəˈdemɪk/", pos: "adj.", definition: "学校的；学院的；学术的", example: "The book brings together several academic subjects.", rank: 1500, frequency: 8, difficulty_level: 2 },
    { word: "accept", pronunciation: "/əkˈsept/", pos: "v.", definition: "接受", example: "Please accept my apology.", rank: 800, frequency: 9, difficulty_level: 2 },
    { word: "achieve", pronunciation: "/əˈtʃiːv/", pos: "v.", definition: "达到；实现", example: "She achieved her goal.", rank: 900, frequency: 8, difficulty_level: 2 },
    { word: "advice", pronunciation: "/ədˈvaɪs/", pos: "n.", definition: "建议；忠告", example: "Can you give me some advice?", rank: 1000, frequency: 8, difficulty_level: 2 },

    // 中级词汇 (difficulty_level: 3, rank: 2000-4000)
    { word: "yearn", pronunciation: "/jɜːn/", pos: "v.", definition: "渴望，切盼", example: "Despite his great commercial success he still yearns for critical approval.", rank: 3500, frequency: 5, difficulty_level: 3 },
    { word: "benevolent", pronunciation: "/bəˈnevələnt/", pos: "adj.", definition: "慈善的；仁慈的", example: "He was a benevolent old man and wouldn't hurt a fly.", rank: 4000, frequency: 4, difficulty_level: 3 },
    { word: "wane", pronunciation: "/weɪn/", pos: "v.", definition: "（势力、影响等）衰弱，减退", example: "By the late 70s the band's popularity was beginning to wane.", rank: 4200, frequency: 5, difficulty_level: 3 },
    { word: "eloquent", pronunciation: "/ˈeləkwənt/", pos: "adj.", definition: "雄辩的；有说服力的", example: "She gave an eloquent speech.", rank: 3800, frequency: 5, difficulty_level: 3 },
    { word: "diligent", pronunciation: "/ˈdɪlɪdʒənt/", pos: "adj.", definition: "勤奋的；勤勉的", example: "He is a diligent student.", rank: 3200, frequency: 6, difficulty_level: 3 },
    { word: "ambiguous", pronunciation: "/æmˈbɪɡjuəs/", pos: "adj.", definition: "模棱两可的；含糊的", example: "The statement was ambiguous.", rank: 3600, frequency: 5, difficulty_level: 3 },

    // 中高级词汇 (difficulty_level: 4, rank: 4000-6000)
    { word: "ubiquitous", pronunciation: "/juːˈbɪkwɪtəs/", pos: "adj.", definition: "普遍存在的，无所不在的", example: "Leather is very much in fashion this season, as is the ubiquitous denim.", rank: 4500, frequency: 4, difficulty_level: 4 },
    { word: "zealous", pronunciation: "/ˈzeləs/", pos: "adj.", definition: "热情的；狂热的", example: "No one was more zealous than Neil in supporting the proposal.", rank: 4700, frequency: 4, difficulty_level: 4 },
    { word: "eclectic", pronunciation: "/ɪˈklektɪk/", pos: "adj.", definition: "不拘一格的；兼收并蓄的", example: "It was an eclectic mix of our ethnic foods and traditional Thanksgiving food.", rank: 4800, frequency: 4, difficulty_level: 4 },
    { word: "magnanimous", pronunciation: "/mæɡˈnænɪməs/", pos: "adj.", definition: "（对敌人或失败者）宽宏大量的", example: "The team's manager was magnanimous in victory.", rank: 5100, frequency: 3, difficulty_level: 4 },
    { word: "fabricate", pronunciation: "/ˈfæbrɪkeɪt/", pos: "v.", definition: "捏造，虚构（借口、谎言等）", example: "He was late, so he fabricated an excuse to avoid trouble.", rank: 5200, frequency: 4, difficulty_level: 4 },
    { word: "quintessential", pronunciation: "/ˌkwɪntɪˈsenʃəl/", pos: "adj.", definition: "最典型的；完美的", example: "Sheep's milk cheese is the quintessential Corsican cheese.", rank: 5300, frequency: 4, difficulty_level: 4 },
    { word: "debilitate", pronunciation: "/dɪˈbɪlɪteɪt/", pos: "v.", definition: "使（身心）衰弱", example: "Chemotherapy exhausted and debilitated him.", rank: 5500, frequency: 3, difficulty_level: 4 },
    { word: "xenophobia", pronunciation: "/ˌzenəˈfəʊbiə/", pos: "n.", definition: "仇外，惧外", example: "The government has denied that the new policy is motivated by xenophobia.", rank: 5600, frequency: 4, difficulty_level: 4 },
    { word: "kaleidoscope", pronunciation: "/kəˈlaɪdəskəʊp/", pos: "n.", definition: "千变万化；万花筒", example: "The street bazaar was a kaleidoscope of colors, smells, and sounds.", rank: 5800, frequency: 3, difficulty_level: 4 },
    { word: "vacillate", pronunciation: "/ˈvæsɪleɪt/", pos: "v.", definition: "摇摆；犹豫不定", example: "Her mood vacillated between hope and despair.", rank: 5900, frequency: 3, difficulty_level: 4 },
    { word: "juxtapose", pronunciation: "/ˌdʒʌkstəˈpəʊz/", pos: "v.", definition: "把…并列；把…并置（以作对比）", example: "The exhibition juxtaposes Picasso's early drawings with some of his later works.", rank: 6000, frequency: 3, difficulty_level: 4 },

    // 高级词汇 (difficulty_level: 5, rank: 6000-8000)
    { word: "rambunctious", pronunciation: "/ræmˈbʌŋkʃəs/", pos: "adj.", definition: "精力过剩的；难管束的", example: "The puppy was rambunctious and chewed on everything.", rank: 6100, frequency: 2, difficulty_level: 5 },
    { word: "languid", pronunciation: "/ˈlæŋɡwɪd/", pos: "adj.", definition: "慢悠悠的；慵懒的", example: "He sat on the porch, enjoying the languid afternoon heat.", rank: 6200, frequency: 2, difficulty_level: 5 },
    { word: "taciturn", pronunciation: "/ˈtæsɪtɜːn/", pos: "adj.", definition: "沉默寡言的", example: "He was a taciturn man who spent most of his time alone.", rank: 6300, frequency: 2, difficulty_level: 5 },
    { word: "cacophony", pronunciation: "/kəˈkɒfəni/", pos: "n.", definition: "刺耳嘈杂的声音；杂音", example: "As we entered the farmyard we were met with a cacophony of animal sounds.", rank: 6500, frequency: 2, difficulty_level: 5 },
    { word: "sagacious", pronunciation: "/səˈɡeɪʃəs/", pos: "adj.", definition: "聪明的，睿智的；有远见的", example: "The leader was known for her sagacious decisions during the crisis.", rank: 6700, frequency: 2, difficulty_level: 5 },
    { word: "nefarious", pronunciation: "/nɪˈfeəriəs/", pos: "adj.", definition: "（尤指活动）邪恶的，不道德的", example: "The company's CEO seems to have been involved in some nefarious practices.", rank: 6800, frequency: 2, difficulty_level: 5 },
    { word: "garrulous", pronunciation: "/ˈɡærələs/", pos: "adj.", definition: "（尤指对琐事）喋喋不休的", example: "I had a garrulous neighbor who talked specifically about her cat.", rank: 7000, frequency: 2, difficulty_level: 5 },
    { word: "harangue", pronunciation: "/həˈræŋ/", pos: "v.", definition: "（愤怒而有力地）训斥，谴责", example: "A drunk in the station was haranguing passers-by.", rank: 7200, frequency: 2, difficulty_level: 5 },
    { word: "obfuscate", pronunciation: "/ˈɒbfʌskeɪt/", pos: "v.", definition: "（尤指故意）可能会混淆；使困惑", example: "She was criticized for using arguments that obfuscated the main issue.", rank: 7500, frequency: 2, difficulty_level: 5 },

    // 专业词汇 (difficulty_level: 6, rank: 8000+)
    { word: "iconoclast", pronunciation: "/naɪˈkɒnəklæst/", pos: "n.", definition: "反传统者；打破偶像者", example: "Rogers, an iconoclast in architecture, is sometimes described as shameless.", rank: 8000, frequency: 1, difficulty_level: 6 },
    { word: "palimpsest", pronunciation: "/ˈpælɪmpsest/", pos: "n.", definition: "多层次结构；具有多重意义的事物", example: "The city is a palimpsest of different cultures and eras.", rank: 9000, frequency: 1, difficulty_level: 6 },
    { word: "sesquipedalian", pronunciation: "/ˌseskwɪpɪˈdeɪliən/", pos: "adj.", definition: "（词语）冗长的；好用长词的", example: "His sesquipedalian prose style made the article difficult to read.", rank: 9500, frequency: 1, difficulty_level: 6 },
    { word: "defenestration", pronunciation: "/diːˌfenɪˈstreɪʃən/", pos: "n.", definition: "将人或物从窗户扔出", example: "The defenestration of Prague was a pivotal event in European history.", rank: 9200, frequency: 1, difficulty_level: 6 },

    { word: "big", pronunciation: "/bɪɡ/", pos: "adj.", definition: "大的", example: "There was a big hole in the road.", rank: 110, frequency: 10, difficulty_level: 1 },
    { word: "large", pronunciation: "/lɑːdʒ/", pos: "adj.", definition: "大的；大量的", example: "A large number of people attended the meeting.", rank: 300, frequency: 10, difficulty_level: 1 },
    { word: "great", pronunciation: "/ɡreɪt/", pos: "adj.", definition: "伟大的；极大的", example: "It was a great pleasure to meet you.", rank: 280, frequency: 10, difficulty_level: 1 },
    { word: "small", pronunciation: "/smɔːl/", pos: "adj.", definition: "小的", example: "They live in a small village.", rank: 140, frequency: 10, difficulty_level: 1 },
    { word: "little", pronunciation: "/ˈlɪtl/", pos: "adj.", definition: "小的；少的", example: "She has a little dog.", rank: 160, frequency: 10, difficulty_level: 1 },
    { word: "tiny", pronunciation: "/ˈtaɪni/", pos: "adj.", definition: "极小的；微小的", example: "The tiny kitten fit in the palm of my hand.", rank: 2100, frequency: 7, difficulty_level: 3 },
    { word: "beautiful", pronunciation: "/ˈbjuːtɪfl/", pos: "adj.", definition: "美丽的", example: "What a beautiful view!", rank: 600, frequency: 9, difficulty_level: 2 },
    { word: "pretty", pronunciation: "/ˈprɪti/", pos: "adj.", definition: "漂亮的；相当", example: "She looked very pretty in that dress.", rank: 700, frequency: 9, difficulty_level: 2 },
    { word: "handsome", pronunciation: "/ˈhænsəm/", pos: "adj.", definition: "英俊的；大方的", example: "He was a handsome young man.", rank: 1600, frequency: 7, difficulty_level: 2 },
    { word: "happy", pronunciation: "/ˈhæpi/", pos: "adj.", definition: "快乐的；幸福的", example: "I'm so happy to see you!", rank: 190, frequency: 10, difficulty_level: 1 },
    { word: "glad", pronunciation: "/ɡlæd/", pos: "adj.", definition: "高兴的；乐意的", example: "I'm glad you could come.", rank: 900, frequency: 8, difficulty_level: 2 },
    { word: "cheerful", pronunciation: "/ˈtʃɪəfl/", pos: "adj.", definition: "开朗的；愉快的", example: "She is always cheerful and smiling.", rank: 2800, frequency: 6, difficulty_level: 3 },
    { word: "sad", pronunciation: "/sæd/", pos: "adj.", definition: "悲伤的", example: "She felt sad about leaving her friends.", rank: 210, frequency: 10, difficulty_level: 1 },
    { word: "unhappy", pronunciation: "/ʌnˈhæpi/", pos: "adj.", definition: "不快乐的；不满意的", example: "He was unhappy with the results.", rank: 1700, frequency: 7, difficulty_level: 2 },
    { word: "sorrowful", pronunciation: "/ˈsɒrəʊfl/", pos: "adj.", definition: "悲伤的；哀痛的", example: "She gave a sorrowful sigh.", rank: 5500, frequency: 3, difficulty_level: 4 },
    { word: "fast", pronunciation: "/fɑːst/", pos: "adj.", definition: "快的；迅速的", example: "The car was going too fast.", rank: 230, frequency: 10, difficulty_level: 1 },
    { word: "quick", pronunciation: "/kwɪk/", pos: "adj.", definition: "快的；敏捷的", example: "She gave a quick answer.", rank: 350, frequency: 10, difficulty_level: 1 },
    { word: "rapid", pronunciation: "/ˈræpɪd/", pos: "adj.", definition: "迅速的；急剧的", example: "The country has seen rapid economic growth.", rank: 2000, frequency: 7, difficulty_level: 3 },
    { word: "smart", pronunciation: "/smɑːt/", pos: "adj.", definition: "聪明的；时髦的", example: "That was a smart decision.", rank: 800, frequency: 9, difficulty_level: 2 },
    { word: "clever", pronunciation: "/ˈklevər/", pos: "adj.", definition: "聪明的；灵巧的", example: "She is a clever student.", rank: 1100, frequency: 8, difficulty_level: 2 },
    { word: "wise", pronunciation: "/waɪz/", pos: "adj.", definition: "明智的；有智慧的", example: "That was a wise choice.", rank: 1400, frequency: 8, difficulty_level: 2 },
    { word: "look", pronunciation: "/lʊk/", pos: "v.", definition: "看；注视", example: "Look at this picture.", rank: 105, frequency: 10, difficulty_level: 1 },
    { word: "see", pronunciation: "/siː/", pos: "v.", definition: "看见；理解", example: "I can see the mountains from here.", rank: 102, frequency: 10, difficulty_level: 1 },
    { word: "watch", pronunciation: "/wɒtʃ/", pos: "v.", definition: "观看；注视", example: "We watched the football game on TV.", rank: 135, frequency: 10, difficulty_level: 1 },
    { word: "say", pronunciation: "/seɪ/", pos: "v.", definition: "说；讲", example: "What did she say?", rank: 101, frequency: 10, difficulty_level: 1 },
    { word: "tell", pronunciation: "/tel/", pos: "v.", definition: "告诉；告知", example: "Please tell me your name.", rank: 103, frequency: 10, difficulty_level: 1 },
    { word: "speak", pronunciation: "/spiːk/", pos: "v.", definition: "说话；演讲", example: "She speaks three languages.", rank: 115, frequency: 10, difficulty_level: 1 },
    { word: "walk", pronunciation: "/wɔːk/", pos: "v.", definition: "步行；散步", example: "We walked to the park.", rank: 125, frequency: 10, difficulty_level: 1 },
    { word: "march", pronunciation: "/mɑːtʃ/", pos: "v.", definition: "行军；齐步前进", example: "The soldiers marched through the streets.", rank: 2200, frequency: 6, difficulty_level: 3 },
    { word: "stroll", pronunciation: "/strəʊl/", pos: "v.", definition: "散步；溜达", example: "We strolled along the beach at sunset.", rank: 3500, frequency: 5, difficulty_level: 3 },
    { word: "huge", pronunciation: "/hjuːdʒ/", pos: "adj.", definition: "巨大的；庞大的", example: "The elephant was absolutely huge.", rank: 1500, frequency: 8, difficulty_level: 2 },
    { word: "enormous", pronunciation: "/ɪˈnɔːməs/", pos: "adj.", definition: "巨大的；极大的", example: "The project required an enormous amount of money.", rank: 3400, frequency: 5, difficulty_level: 3 },
    { word: "angry", pronunciation: "/ˈæŋɡri/", pos: "adj.", definition: "生气的；愤怒的", example: "She was angry at the delay.", rank: 400, frequency: 9, difficulty_level: 2 },
    { word: "furious", pronunciation: "/ˈfjʊəriəs/", pos: "adj.", definition: "暴怒的；狂怒的", example: "He was furious at the accusation.", rank: 3800, frequency: 5, difficulty_level: 3 },
    { word: "mad", pronunciation: "/mæd/", pos: "adj.", definition: "疯狂的；生气的", example: "Are you mad at me?", rank: 600, frequency: 9, difficulty_level: 2 },
    { word: "begin", pronunciation: "/bɪˈɡɪn/", pos: "v.", definition: "开始", example: "The concert begins at 8 pm.", rank: 350, frequency: 10, difficulty_level: 1 },
    { word: "start", pronunciation: "/stɑːt/", pos: "v.", definition: "开始；出发", example: "What time does the meeting start?", rank: 250, frequency: 10, difficulty_level: 1 },
    { word: "commence", pronunciation: "/kəˈmens/", pos: "v.", definition: "开始；着手（正式用语）", example: "The ceremony will commence shortly.", rank: 4800, frequency: 4, difficulty_level: 4 },
    { word: "help", pronunciation: "/help/", pos: "v.", definition: "帮助；帮忙", example: "Can you help me with this?", rank: 108, frequency: 10, difficulty_level: 1 },
    { word: "assist", pronunciation: "/əˈsɪst/", pos: "v.", definition: "协助；帮助", example: "The nurse assisted the doctor during the operation.", rank: 2500, frequency: 6, difficulty_level: 3 },
    { word: "aid", pronunciation: "/eɪd/", pos: "v.", definition: "援助；资助", example: "The government aided the victims of the flood.", rank: 2700, frequency: 6, difficulty_level: 3 }
];


const THEMES = [
    { id: 1, key: 'business', name: '商务', icon: '💼', color: '#3b82f6' },
    { id: 2, key: 'travel', name: '旅游', icon: '✈️', color: '#10b981' },
    { id: 3, key: 'academic', name: '学术', icon: '🎓', color: '#8b5cf6' },
    { id: 4, key: 'tech', name: '科技', icon: '💻', color: '#06b6d4' },
    { id: 5, key: 'daily', name: '日常口语', icon: '💬', color: '#f59e0b' },
    { id: 6, key: 'medical', name: '医疗健康', icon: '🏥', color: '#ef4444' },
    { id: 7, key: 'law', name: '法律财经', icon: '⚖️', color: '#a855f7' },
    { id: 8, key: 'sports', name: '体育运动', icon: '⚽', color: '#22c55e' }
];

const wordThemeMap = {
    'business': [
        'ability', 'accept', 'achieve', 'advice', 'absolute', 'absence', 'abandon',
        'achieve', 'advice', 'absolute', 'academic', 'accept', 'ability',
        'ambiguous', 'benevolent', 'diligent', 'eloquent', 'fabricate',
        'magnanimous', 'nefarious', 'quintessential', 'sagacious', 'ubiquitous',
        'vacillate', 'yearn', 'zealous'
    ],
    'travel': [
        'abandon', 'absence', 'accept', 'achievement', 'adventure',
        'yearn', 'ubiquitous', 'vacillate', 'wane', 'zealous'
    ],
    'academic': [
        'academic', 'ability', 'ambiguous', 'eloquent', 'diligent', 'absolute', 'absence',
        'academic', 'accept', 'achieve', 'advice', 'ambiguous',
        'benevolent', 'debilitate', 'diligent', 'eclectic', 'eloquent',
        'fabricate', 'harangue', 'iconoclast', 'juxtapose', 'kaleidoscope',
        'languid', 'magnanimous', 'obfuscate', 'palimpsest', 'quintessential',
        'rambunctious', 'sagacious', 'sesquipedalian', 'taciturn', 'ubiquitous',
        'vacillate', 'wane', 'xenophobia', 'yearn', 'zealous'
    ],
    'tech': [
        'ubiquitous', 'fabricate', 'obfuscate', 'eclectic',
        'ability', 'accept', 'achieve', 'ambiguous', 'debilitate',
        'iconoclast', 'juxtapose', 'kaleidoscope', 'obfuscate',
        'palimpsest', 'quintessential', 'sesquipedalian', 'vacillate'
    ],
    'daily': [
        'apple', 'book', 'cat', 'dog', 'eat', 'water', 'house', 'time', 'accept', 'advice', 'ability',
        'absolute', 'absence', 'abandon', 'accept', 'achieve', 'advice',
        'apartment', 'breakfast', 'buy', 'cook', 'dinner', 'drink',
        'family', 'friend', 'go', 'happy', 'home', 'house',
        'job', 'kitchen', 'learn', 'lunch', 'money', 'morning',
        'night', 'office', 'read', 'restaurant', 'school', 'shop',
        'sleep', 'speak', 'study', 'talk', 'teach', 'telephone',
        'travel', 'walk', 'wash', 'watch', 'work', 'write'
    ],
    'medical': [
        'debilitate', 'languid', 'yearn',
        'absence', 'accept', 'ache', 'advice', 'ambulance', 'appointment',
        'bed', 'blood', 'body', 'care', 'clinic', 'cold',
        'cough', 'dentist', 'doctor', 'drug', 'emergency', 'exercise',
        'eye', 'fever', 'flu', 'food', 'habit', 'hand',
        'headache', 'health', 'heart', 'hospital', 'illness', 'injection',
        'medicine', 'nurse', 'operation', 'pain', 'patient', 'pill',
        'prescription', 'sick', 'surgery', 'symptom', 'temperature', 'toothache',
        'treatment', 'vaccine', 'virus', 'vitamin', 'water', 'xray'
    ],
    'law': [
        'nefarious', 'garrulous', 'harangue', 'defenestration', 'abandon', 'absolute',
        'absence', 'accept', 'accuse', 'action', 'agreement', 'appeal',
        'arrest', 'attorney', 'ban', 'benefit', 'breach', 'case',
        'charge', 'citizen', 'claim', 'client', 'court', 'crime',
        'criminal', 'damage', 'defendant', 'defense', 'dispute', 'document',
        'evidence', 'fine', 'fraud', 'guilty', 'harassment', 'illegal',
        'judge', 'judgment', 'jury', 'justice', 'lawyer', 'legal',
        'liability', 'license', 'litigation', 'negligence', 'notary', 'oath',
        'obligation', 'offense', 'parole', 'party', 'penalty', 'petition',
        'plaintiff', 'plead', 'policy', 'precedent', 'prosecute', 'regulation',
        'ruling', 'settlement', 'statute', 'subpoena', 'sue', 'summons',
        'testimony', 'tort', 'trial', 'verdict', 'violation', 'warrant',
        'witness', 'writ'
    ],
    'sports': [
        'rambunctious', 'diligent', 'zealous',
        'ability', 'achieve', 'active', 'athlete', 'ball', 'basketball',
        'bike', 'boat', 'bowling', 'boxing', 'champion', 'cheer',
        'coach', 'compete', 'competition', 'court', 'defense', 'effort',
        'endurance', 'equipment', 'exercise', 'fan', 'field', 'final',
        'football', 'game', 'goal', 'golf', 'gym', 'hockey',
        'injure', 'judge', 'league', 'loss', 'marathon', 'match',
        'medal', 'offense', 'olympics', 'opponent', 'outdoor', 'play',
        'player', 'point', 'prize', 'race', 'referee', 'score',
        'season', 'soccer', 'stadium', 'strength', 'swim', 'team',
        'tennis', 'tournament', 'training', 'trophy', 'victory', 'volleyball',
        'warmup', 'win', 'workout', 'worldcup'
    ]
};

const SYNONYM_GROUPS = [
    {
        name: 'big / large / great',
        description: '均表示"大"，但侧重不同',
        members: [
            { word: 'big', usage_diff: '最常用，指体积、面积、重量等大，偏口语化' },
            { word: 'large', usage_diff: '较正式，指体积、数量、容量等大，范围更广' },
            { word: 'great', usage_diff: '强调程度、重要性或伟大，也常表示"极好的"' }
        ]
    },
    {
        name: 'small / little / tiny',
        description: '均表示"小"，但语气和侧重点不同',
        members: [
            { word: 'small', usage_diff: '客观描述尺寸、数量等小，中性词' },
            { word: 'little', usage_diff: '带感情色彩，常含可爱、怜悯之意' },
            { word: 'tiny', usage_diff: '强调极小、微小的程度' }
        ]
    },
    {
        name: 'beautiful / pretty / handsome',
        description: '均表示"好看"，但适用对象和语气不同',
        members: [
            { word: 'beautiful', usage_diff: '形容人或物极为美丽，程度最深，尤指女性' },
            { word: 'pretty', usage_diff: '娇小可爱之美，程度较轻，多用于女性或小孩' },
            { word: 'handsome', usage_diff: '形容男性英俊，或指体面、大方的美' }
        ]
    },
    {
        name: 'happy / glad / cheerful',
        description: '均表示"高兴"，但用法和语境有差异',
        members: [
            { word: 'happy', usage_diff: '最通用，表示幸福、满足的高兴' },
            { word: 'glad', usage_diff: '多用于对某事感到高兴，常搭配 about 或不定式' },
            { word: 'cheerful', usage_diff: '强调开朗、乐观的性格或情绪状态' }
        ]
    },
    {
        name: 'sad / unhappy / sorrowful',
        description: '均表示"悲伤"，但程度和用法不同',
        members: [
            { word: 'sad', usage_diff: '最通用，泛指各种程度的悲伤' },
            { word: 'unhappy', usage_diff: '侧重不快乐、不满意，程度较轻' },
            { word: 'sorrowful', usage_diff: '文学用词，表示深切的悲伤和哀痛' }
        ]
    },
    {
        name: 'fast / quick / rapid',
        description: '均表示"快"，但侧重点和搭配不同',
        members: [
            { word: 'fast', usage_diff: '侧重速度高，可作形容词和副词' },
            { word: 'quick', usage_diff: '侧重时间短、反应迅速，更强调短暂' },
            { word: 'rapid', usage_diff: '较正式，指变化或增长速度快' }
        ]
    },
    {
        name: 'smart / clever / wise',
        description: '均表示"聪明"，但含义侧重不同',
        members: [
            { word: 'smart', usage_diff: '强调机敏、精明，美式也指整洁时髦' },
            { word: 'clever', usage_diff: '强调学习和理解能力强，善于做某事' },
            { word: 'wise', usage_diff: '强调有智慧、判断力强，经验丰富' }
        ]
    },
    {
        name: 'look / see / watch',
        description: '均与"看"有关，但动作方式不同',
        members: [
            { word: 'look', usage_diff: '强调看的动作，通常搭配 at' },
            { word: 'see', usage_diff: '强调看的结果，自然地看到' },
            { word: 'watch', usage_diff: '强调专注地、持续地观察' }
        ]
    },
    {
        name: 'say / tell / speak',
        description: '均与"说"有关，但用法和搭配不同',
        members: [
            { word: 'say', usage_diff: '强调说话的内容，后接引语或 that 从句' },
            { word: 'tell', usage_diff: '强调告知某人某事，搭配双宾语' },
            { word: 'speak', usage_diff: '强调说话的行为或能力，不强调内容' }
        ]
    },
    {
        name: 'walk / march / stroll',
        description: '均表示"走"，但方式和语气不同',
        members: [
            { word: 'walk', usage_diff: '最通用的"步行"，无特殊感情色彩' },
            { word: 'march', usage_diff: '指齐步前进，带有严肃或坚定的意味' },
            { word: 'stroll', usage_diff: '指悠闲散步，节奏缓慢放松' }
        ]
    },
    {
        name: 'big / huge / enormous',
        description: '均表示"巨大"，但程度递进',
        members: [
            { word: 'big', usage_diff: '最基础的"大"，使用最广泛' },
            { word: 'huge', usage_diff: '比 big 更大，强调体积或规模超出常规' },
            { word: 'enormous', usage_diff: '极大，强调大到惊人的程度，较正式' }
        ]
    },
    {
        name: 'angry / furious / mad',
        description: '均表示"生气"，但程度和用法不同',
        members: [
            { word: 'angry', usage_diff: '最通用的"生气"，程度可轻可重' },
            { word: 'furious', usage_diff: '暴怒的，程度极强，近乎失控' },
            { word: 'mad', usage_diff: '口语中指生气，英式也可指发疯' }
        ]
    },
    {
        name: 'begin / start / commence',
        description: '均表示"开始"，但正式程度不同',
        members: [
            { word: 'begin', usage_diff: '较通用，与 start 常互换，但偏正式' },
            { word: 'start', usage_diff: '更口语化，强调动作的起始，可指突然开始' },
            { word: 'commence', usage_diff: '非常正式，常用于法律、仪式等场合' }
        ]
    },
    {
        name: 'help / assist / aid',
        description: '均表示"帮助"，但正式程度和侧重点不同',
        members: [
            { word: 'help', usage_diff: '最常用，指一般性的帮助，口语和书面均适用' },
            { word: 'assist', usage_diff: '较正式，指从旁辅助，常为下级帮助上级' },
            { word: 'aid', usage_diff: '正式用词，常指物质或资金上的援助' }
        ]
    }
];

const CONFUSABLE_PAIRS = [
    { word1: 'affect', word2: 'effect', tip: 'affect 动词"影响"；effect 名词"效果"' },
    { word1: 'accept', word2: 'except', tip: 'accept"接受"；except"除了"' },
    { word1: 'adapt', word2: 'adopt', tip: 'adapt"适应"；adopt"采纳/收养"' },
    { word1: 'complement', word2: 'compliment', tip: 'complement"补充"；compliment"赞美"' },
    { word1: 'principal', word2: 'principle', tip: 'principal"主要的/校长"；principle"原则"' },
    { word1: 'stationary', word2: 'stationery', tip: 'stationary"静止的"；stationery"文具"' },
    { word1: 'desert', word2: 'dessert', tip: 'desert"沙漠/抛弃"；dessert"甜点"' },
    { word1: 'personal', word2: 'personnel', tip: 'personal"个人的"；personnel"人事/员工"' },
    { word1: 'economic', word2: 'economical', tip: 'economic"经济的"；economical"节约的"' },
    { word1: 'historic', word2: 'historical', tip: 'historic"有历史意义的"；historical"历史上的"' }
];

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        vocab_size INTEGER DEFAULT 0,
        onboarding_completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
            console.error('Error checking users table info:', err);
            return;
        }
        const columnNames = columns.map(c => c.name);
        if (!columnNames.includes('onboarding_completed')) {
            db.run("ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0", (err) => {
                if (err) console.error('Error adding onboarding_completed column:', err);
                else console.log('Added onboarding_completed column to users table');
            });
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT UNIQUE,
        pronunciation TEXT,
        pos TEXT,
        definition TEXT,
        example TEXT,
        rank INTEGER,
        frequency INTEGER DEFAULT 5,
        difficulty_level INTEGER DEFAULT 3
    )`);

    db.all("PRAGMA table_info(words)", (err, columns) => {
        if (err) {
            console.error('Error checking table info:', err);
            return;
        }

        const columnNames = columns.map(c => c.name);

        if (!columnNames.includes('frequency')) {
            db.run("ALTER TABLE words ADD COLUMN frequency INTEGER DEFAULT 5", (err) => {
                if (err) console.error('Error adding frequency column:', err);
                else console.log('Added frequency column to words table');
            });
        }

        if (!columnNames.includes('difficulty_level')) {
            db.run("ALTER TABLE words ADD COLUMN difficulty_level INTEGER DEFAULT 3", (err) => {
                if (err) console.error('Error adding difficulty_level column:', err);
                else console.log('Added difficulty_level column to words table');
            });
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS test_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        word_id INTEGER,
        is_correct INTEGER,
        word_rank INTEGER,
        tested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(word_id) REFERENCES words(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS learning_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        word_id INTEGER,
        status TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(word_id) REFERENCES words(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS study_plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        word_id INTEGER,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(word_id) REFERENCES words(id),
        UNIQUE(user_id, word_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS spelling_challenge_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        session_id TEXT,
        word_id INTEGER,
        user_answer TEXT,
        is_correct INTEGER,
        time_spent INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(word_id) REFERENCES words(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS spelling_challenge_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        session_id TEXT UNIQUE,
        total_questions INTEGER,
        correct_count INTEGER,
        total_time INTEGER,
        score INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS themes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        name TEXT,
        icon TEXT,
        color TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS word_themes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word_id INTEGER,
        theme_id INTEGER,
        FOREIGN KEY(word_id) REFERENCES words(id),
        FOREIGN KEY(theme_id) REFERENCES themes(id),
        UNIQUE(word_id, theme_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS user_theme_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        theme_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(theme_id) REFERENCES themes(id),
        UNIQUE(user_id, theme_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        detail TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type)`);

    db.run(`CREATE TABLE IF NOT EXISTS vocabulary_notebook (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        word_id INTEGER NOT NULL,
        personal_note TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(word_id) REFERENCES words(id),
        UNIQUE(user_id, word_id)
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_vocab_notebook_user ON vocabulary_notebook(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_vocab_notebook_user_word ON vocabulary_notebook(user_id, word_id)`);

    db.run(`CREATE TABLE IF NOT EXISTS listening_practice_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        session_id TEXT,
        word_id INTEGER,
        selected_option_id INTEGER,
        is_correct INTEGER,
        time_spent INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(word_id) REFERENCES words(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS listening_practice_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        session_id TEXT UNIQUE,
        mode TEXT,
        total_questions INTEGER,
        correct_count INTEGER,
        total_time INTEGER,
        avg_reaction_time INTEGER,
        max_streak INTEGER,
        score INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS synonym_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS synonym_group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        word_id INTEGER NOT NULL,
        usage_diff TEXT,
        FOREIGN KEY(group_id) REFERENCES synonym_groups(id),
        FOREIGN KEY(word_id) REFERENCES words(id),
        UNIQUE(group_id, word_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS confusable_pairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word1 TEXT NOT NULL,
        word2 TEXT NOT NULL,
        tip TEXT,
        UNIQUE(word1, word2)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS synonym_search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        keyword TEXT NOT NULL,
        searched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_synonym_search_history_user ON synonym_search_history(user_id, searched_at DESC)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_synonym_group_members_group ON synonym_group_members(group_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_synonym_group_members_word ON synonym_group_members(word_id)`);

    setTimeout(() => {
        const stmt = db.prepare(`
            INSERT INTO words (word, pronunciation, pos, definition, example, rank, frequency, difficulty_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(word) DO UPDATE SET
                definition=excluded.definition,
                pos=excluded.pos,
                frequency=excluded.frequency,
                difficulty_level=excluded.difficulty_level
        `);

        wordList.forEach(w => {
            stmt.run(w.word, w.pronunciation, w.pos, w.definition, w.example, w.rank, w.frequency, w.difficulty_level);
        });
        stmt.finalize();
        console.log('Word data seeded successfully');

        const themeStmt = db.prepare(`
            INSERT INTO themes (id, key, name, icon, color)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                name=excluded.name,
                icon=excluded.icon,
                color=excluded.color
        `);

        THEMES.forEach(t => {
            themeStmt.run(t.id, t.key, t.name, t.icon, t.color);
        });
        themeStmt.finalize();
        console.log('Theme data seeded successfully');

        setTimeout(() => {
            const wtStmt = db.prepare(`
                INSERT OR IGNORE INTO word_themes (word_id, theme_id)
                SELECT w.id, t.id FROM words w, themes t
                WHERE w.word = ? AND t.key = ?
            `);

            Object.entries(wordThemeMap).forEach(([themeKey, words]) => {
                words.forEach(word => {
                    wtStmt.run(word, themeKey);
                });
            });
            wtStmt.finalize();
            console.log('Word-theme associations seeded successfully');

            setTimeout(() => {
                const sgStmt = db.prepare(`
                    INSERT INTO synonym_groups (name, description)
                    VALUES (?, ?)
                `);

                const sgmStmt = db.prepare(`
                    INSERT OR IGNORE INTO synonym_group_members (group_id, word_id, usage_diff)
                    SELECT ?, w.id, ?
                    FROM words w
                    WHERE w.word = ?
                `);

                const cpStmt = db.prepare(`
                    INSERT OR IGNORE INTO confusable_pairs (word1, word2, tip)
                    VALUES (?, ?, ?)
                `);

                SYNONYM_GROUPS.forEach((group) => {
                    sgStmt.run(group.name, group.description);
                    const groupId = sgStmt.lastID;
                    group.members.forEach(m => {
                        sgmStmt.run(groupId, m.usage_diff, m.word);
                    });
                });
                sgStmt.finalize();
                sgmStmt.finalize();

                CONFUSABLE_PAIRS.forEach(pair => {
                    cpStmt.run(pair.word1, pair.word2, pair.tip);
                });
                cpStmt.finalize();
                console.log('Synonym groups and confusable pairs seeded successfully');
            }, 300);
        }, 300);
    }, 500);
});

const createNotification = (userId, type, title, summary, detail) => {
    db.run(
        "INSERT INTO notifications (user_id, type, title, summary, detail) VALUES (?, ?, ?, ?, ?)",
        [userId, type, title, summary, detail || null],
        (err) => {
            if (err) console.error('Error creating notification:', err);
        }
    );
};

module.exports = { db, THEMES, CONFUSABLE_PAIRS, createNotification };
