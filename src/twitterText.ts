import PunyCode from '../src/punyCode';

module TwitterText {
    /*!
    * from twitter-text 2.0.5
    * https://github.com/twitter/twitter-text
    */

    export function getTweetLength(text: string): number {
        const options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultConfigs;

        return parseTweet(text, options).weightedLength;
    }

    interface IOption {
        version: number;
        maxWeightedTweetLength: number;
        scale: number;
        defaultWeight: number;
        transformedURLLength: number;
        ranges: IRange[];
    }

    interface IRange {
        start: number;
        end: number;
        weight: number;
    }

    const version = 2;
    const maxWeightedTweetLength = 280;
    const scale = 100;
    const defaultWeight = 200;
    const transformedURLLength = 23;
    const ranges = [
        {
            'start': 0,
            'end': 4351,
            'weight': 100
        },
        {
            'start': 8192,
            'end': 8205,
            'weight': 100
        },
        {
            'start': 8208,
            'end': 8223,
            'weight': 100
        },
        {
            'start': 8242,
            'end': 8247,
            'weight': 100
        }
    ];

    const defaultConfigs: IOption = {
        version: version,
        maxWeightedTweetLength: maxWeightedTweetLength,
        scale: scale,
        defaultWeight: defaultWeight,
        transformedURLLength: transformedURLLength,
        ranges: ranges
    };

    function regexSupplant(regex: any, map: any = {}, flags: string = '') {
        flags = flags || '';
        if (typeof regex !== 'string') {
            if (regex.global && flags.indexOf('g') < 0) {
                flags += 'g';
            }
            if (regex.ignoreCase && flags.indexOf('i') < 0) {
                flags += 'i';
            }
            if (regex.multiline && flags.indexOf('m') < 0) {
                flags += 'm';
            }

            regex = regex.source;
        }

        return new RegExp(regex.replace(/#\{(\w+)\}/g, (_match: string, name: string) => {
            let newRegex = map[name] || '';
            if (typeof newRegex !== 'string') {
                newRegex = newRegex.source;
            }
            return newRegex;
        }), flags);
    }

    const _extends = Object.assign || function (target: any) {
        for (let i = 1; i < arguments.length; i++) {
            const source = arguments[i];
            for (let key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    target[key] = source[key];
                }
            }
        }
        return target;
    };

    interface IUrlEntity {
        indices: number[];
        url: string;
    }

    function parseTweet(text: string, options: IOption = defaultConfigs) {
        const mergedOptions = _extends({}, defaultConfigs, options);
        const mergedOptionsScale = mergedOptions.scale;
        const mergedOptionsMaxWeightedTweetLength = mergedOptions.maxWeightedTweetLength;
        const mergedOptionsTransformedURLLength = mergedOptions.transformedURLLength;

        const normalizedText = typeof String.prototype.normalize === 'function' ? text.normalize() : text;
        const urlsWithIndices = extractUrlsWithIndices(normalizedText);
        const tweetLength = normalizedText.length;

        let weightedLength = 0;
        let validDisplayIndex = 0;
        let valid = true;
        let charIndex = 0;
        // Go through every character and calculate weight

        const _loop = function _loop(_charIndex: number): void {
            // If a url begins at the specified index handle, add constant length
            const urlEntity = urlsWithIndices.filter(function (ref: IUrlEntity) {
                const indices = ref.indices;
                return indices[0] === _charIndex;
            })[0];
            if (urlEntity) {
                const url = urlEntity.url;

                weightedLength += mergedOptionsTransformedURLLength * mergedOptionsScale;
                _charIndex += url.length - 1;
            } else {
                if (isSurrogatePair(normalizedText, _charIndex)) {
                    _charIndex += 1;
                }
                weightedLength += getCharacterWeight(normalizedText.charAt(_charIndex), mergedOptions);
            }

            // Only test for validity of character if it is still valid
            if (valid) {
                valid = !hasInvalidCharacters(normalizedText.substring(_charIndex, _charIndex + 1));
            }
            if (valid && weightedLength <= mergedOptionsMaxWeightedTweetLength * mergedOptionsScale) {
                validDisplayIndex = _charIndex;
            }
            charIndex = _charIndex;
        };

        for (charIndex = 0; charIndex < tweetLength; charIndex++) {
            _loop(charIndex);
        }

        weightedLength = weightedLength / mergedOptionsScale;
        valid = valid && weightedLength > 0 && weightedLength <= mergedOptionsMaxWeightedTweetLength;
        const permillage = Math.floor(weightedLength / mergedOptionsMaxWeightedTweetLength * 1000);
        validDisplayIndex += text.length - normalizedText.length;

        return {
            weightedLength: weightedLength,
            valid: valid,
            permillage: permillage,
            validRangeStart: 0,
            validRangeEnd: validDisplayIndex,
            displayRangeStart: 0,
            displayRangeEnd: text.length > 0 ? text.length - 1 : 0
        };
    }

    function isSurrogatePair(text: string, cIndex: number): boolean {
        // Test if a character is the beginning of a surrogate pair
        if (cIndex < text.length - 1) {
            const c = text.charCodeAt(cIndex);
            const cNext = text.charCodeAt(cIndex + 1);
            return 0xD800 <= c && c <= 0xDBFF && 0xDC00 <= cNext && cNext <= 0xDFFF;
        }
        return false;
    }

    const invalidCharsGroup = /\uFFFE\uFEFF\uFFFF\u202A-\u202E/;
    const invalidChars = regexSupplant(/[#{invalidCharsGroup}]/, {invalidCharsGroup: invalidCharsGroup});

    function hasInvalidCharacters(text: string) {
        return invalidChars.test(text);
    }

    // simple string interpolation
    function stringSupplant(str: string, map: any) {
        return str.replace(/#\{(\w+)\}/g, (_match, name) => map[name] || '');
    }

    const punct = /\!'#%&'\(\)*\+,\\\-\.\/:;<=>\?@\[\]\^_{|}~\$/;
    const spacesGroup = /\x09-\x0D\x20\x85\xA0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000/;
    const invalidDomainChars = stringSupplant('#{punct}#{spacesGroup}#{invalidCharsGroup}', {
        punct: punct,
        spacesGroup: spacesGroup,
        invalidCharsGroup: invalidCharsGroup
    });
    const validDomainChars = regexSupplant(/[^#{invalidDomainChars}]/, {invalidDomainChars: invalidDomainChars});
    const validDomainName = regexSupplant(/(?:(?:#{validDomainChars}(?:-|#{validDomainChars})*)?#{validDomainChars}\.)/, {validDomainChars: validDomainChars});
    const validCCTLD = regexSupplant(RegExp('(?:(?:' + '한국|香港|澳門|新加坡|台灣|台湾|中國|中国|გე|ไทย|ලංකා|ഭാരതം|ಭಾರತ|భారత్|சிங்கப்பூர்|இலங்கை|இந்தியா|ଭାରତ|ભારત|ਭਾਰਤ|' + 'ভাৰত|ভারত|বাংলা|भारोत|भारतम्|भारत|ڀارت|پاکستان|موريتانيا|مليسيا|مصر|قطر|فلسطين|عمان|عراق|سورية|' + 'سودان|تونس|بھارت|بارت|ایران|امارات|المغرب|السعودية|الجزائر|الاردن|հայ|қаз|укр|срб|рф|мон|мкд|ею|' + 'бел|бг|ελ|zw|zm|za|yt|ye|ws|wf|vu|vn|vi|vg|ve|vc|va|uz|uy|us|um|uk|ug|ua|tz|tw|tv|tt|tr|tp|to|' + 'tn|tm|tl|tk|tj|th|tg|tf|td|tc|sz|sy|sx|sv|su|st|ss|sr|so|sn|sm|sl|sk|sj|si|sh|sg|se|sd|sc|sb|sa|' + 'rw|ru|rs|ro|re|qa|py|pw|pt|ps|pr|pn|pm|pl|pk|ph|pg|pf|pe|pa|om|nz|nu|nr|np|no|nl|ni|ng|nf|ne|nc|' + 'na|mz|my|mx|mw|mv|mu|mt|ms|mr|mq|mp|mo|mn|mm|ml|mk|mh|mg|mf|me|md|mc|ma|ly|lv|lu|lt|ls|lr|lk|li|' + 'lc|lb|la|kz|ky|kw|kr|kp|kn|km|ki|kh|kg|ke|jp|jo|jm|je|it|is|ir|iq|io|in|im|il|ie|id|hu|ht|hr|hn|' + 'hm|hk|gy|gw|gu|gt|gs|gr|gq|gp|gn|gm|gl|gi|gh|gg|gf|ge|gd|gb|ga|fr|fo|fm|fk|fj|fi|eu|et|es|er|eh|' + 'eg|ee|ec|dz|do|dm|dk|dj|de|cz|cy|cx|cw|cv|cu|cr|co|cn|cm|cl|ck|ci|ch|cg|cf|cd|cc|ca|bz|by|bw|bv|' + 'bt|bs|br|bq|bo|bn|bm|bl|bj|bi|bh|bg|bf|be|bd|bb|ba|az|ax|aw|au|at|as|ar|aq|ao|an|am|al|ai|ag|af|' + 'ae|ad|ac' + ')(?=[^0-9a-zA-Z@]|$))'));
    const validGTLD = regexSupplant(RegExp('(?:(?:' + '삼성|닷컴|닷넷|香格里拉|餐厅|食品|飞利浦|電訊盈科|集团|通販|购物|谷歌|诺基亚|联通|网络|网站|网店|网址|组织机构|移动|珠宝|点看|游戏|淡马锡|机构|書籍|时尚|新闻|政府|' + '政务|手表|手机|我爱你|慈善|微博|广东|工行|家電|娱乐|天主教|大拿|大众汽车|在线|嘉里大酒店|嘉里|商标|商店|商城|公益|公司|八卦|健康|信息|佛山|企业|中文网|中信|世界|' + 'ポイント|ファッション|セール|ストア|コム|グーグル|クラウド|みんな|คอม|संगठन|नेट|कॉम|همراه|موقع|موبايلي|كوم|كاثوليك|عرب|شبكة|' + 'بيتك|بازار|العليان|ارامكو|اتصالات|ابوظبي|קום|сайт|рус|орг|онлайн|москва|ком|католик|дети|' + 'zuerich|zone|zippo|zip|zero|zara|zappos|yun|youtube|you|yokohama|yoga|yodobashi|yandex|yamaxun|' + 'yahoo|yachts|xyz|xxx|xperia|xin|xihuan|xfinity|xerox|xbox|wtf|wtc|wow|world|works|work|woodside|' + 'wolterskluwer|wme|winners|wine|windows|win|williamhill|wiki|wien|whoswho|weir|weibo|wedding|wed|' + 'website|weber|webcam|weatherchannel|weather|watches|watch|warman|wanggou|wang|walter|walmart|' + 'wales|vuelos|voyage|voto|voting|vote|volvo|volkswagen|vodka|vlaanderen|vivo|viva|vistaprint|' + 'vista|vision|visa|virgin|vip|vin|villas|viking|vig|video|viajes|vet|versicherung|' + 'vermögensberatung|vermögensberater|verisign|ventures|vegas|vanguard|vana|vacations|ups|uol|uno|' + 'university|unicom|uconnect|ubs|ubank|tvs|tushu|tunes|tui|tube|trv|trust|travelersinsurance|' + 'travelers|travelchannel|travel|training|trading|trade|toys|toyota|town|tours|total|toshiba|' + 'toray|top|tools|tokyo|today|tmall|tkmaxx|tjx|tjmaxx|tirol|tires|tips|tiffany|tienda|tickets|' + 'tiaa|theatre|theater|thd|teva|tennis|temasek|telefonica|telecity|tel|technology|tech|team|tdk|' + 'tci|taxi|tax|tattoo|tatar|tatamotors|target|taobao|talk|taipei|tab|systems|symantec|sydney|' + 'swiss|swiftcover|swatch|suzuki|surgery|surf|support|supply|supplies|sucks|style|study|studio|' + 'stream|store|storage|stockholm|stcgroup|stc|statoil|statefarm|statebank|starhub|star|staples|' + 'stada|srt|srl|spreadbetting|spot|spiegel|space|soy|sony|song|solutions|solar|sohu|software|' + 'softbank|social|soccer|sncf|smile|smart|sling|skype|sky|skin|ski|site|singles|sina|silk|shriram|' + 'showtime|show|shouji|shopping|shop|shoes|shiksha|shia|shell|shaw|sharp|shangrila|sfr|sexy|sex|' + 'sew|seven|ses|services|sener|select|seek|security|secure|seat|search|scot|scor|scjohnson|' + 'science|schwarz|schule|school|scholarships|schmidt|schaeffler|scb|sca|sbs|sbi|saxo|save|sas|' + 'sarl|sapo|sap|sanofi|sandvikcoromant|sandvik|samsung|samsclub|salon|sale|sakura|safety|safe|' + 'saarland|ryukyu|rwe|run|ruhr|rugby|rsvp|room|rogers|rodeo|rocks|rocher|rmit|rip|rio|ril|' + 'rightathome|ricoh|richardli|rich|rexroth|reviews|review|restaurant|rest|republican|report|' + 'repair|rentals|rent|ren|reliance|reit|reisen|reise|rehab|redumbrella|redstone|red|recipes|' + 'realty|realtor|realestate|read|raid|radio|racing|qvc|quest|quebec|qpon|pwc|pub|prudential|pru|' + 'protection|property|properties|promo|progressive|prof|productions|prod|pro|prime|press|praxi|' + 'pramerica|post|porn|politie|poker|pohl|pnc|plus|plumbing|playstation|play|place|pizza|pioneer|' + 'pink|ping|pin|pid|pictures|pictet|pics|piaget|physio|photos|photography|photo|phone|philips|phd|' + 'pharmacy|pfizer|pet|pccw|pay|passagens|party|parts|partners|pars|paris|panerai|panasonic|' + 'pamperedchef|page|ovh|ott|otsuka|osaka|origins|orientexpress|organic|org|orange|oracle|open|ooo|' + 'onyourside|online|onl|ong|one|omega|ollo|oldnavy|olayangroup|olayan|okinawa|office|off|observer|' + 'obi|nyc|ntt|nrw|nra|nowtv|nowruz|now|norton|northwesternmutual|nokia|nissay|nissan|ninja|nikon|' + 'nike|nico|nhk|ngo|nfl|nexus|nextdirect|next|news|newholland|new|neustar|network|netflix|netbank|' + 'net|nec|nba|navy|natura|nationwide|name|nagoya|nadex|nab|mutuelle|mutual|museum|mtr|mtpc|mtn|' + 'msd|movistar|movie|mov|motorcycles|moto|moscow|mortgage|mormon|mopar|montblanc|monster|money|' + 'monash|mom|moi|moe|moda|mobily|mobile|mobi|mma|mls|mlb|mitsubishi|mit|mint|mini|mil|microsoft|' + 'miami|metlife|merckmsd|meo|menu|men|memorial|meme|melbourne|meet|media|med|mckinsey|mcdonalds|' + 'mcd|mba|mattel|maserati|marshalls|marriott|markets|marketing|market|map|mango|management|man|' + 'makeup|maison|maif|madrid|macys|luxury|luxe|lupin|lundbeck|ltda|ltd|lplfinancial|lpl|love|lotto|' + 'lotte|london|lol|loft|locus|locker|loans|loan|lixil|living|live|lipsy|link|linde|lincoln|limo|' + 'limited|lilly|like|lighting|lifestyle|lifeinsurance|life|lidl|liaison|lgbt|lexus|lego|legal|' + 'lefrak|leclerc|lease|lds|lawyer|law|latrobe|latino|lat|lasalle|lanxess|landrover|land|lancome|' + 'lancia|lancaster|lamer|lamborghini|ladbrokes|lacaixa|kyoto|kuokgroup|kred|krd|kpn|kpmg|kosher|' + 'komatsu|koeln|kiwi|kitchen|kindle|kinder|kim|kia|kfh|kerryproperties|kerrylogistics|kerryhotels|' + 'kddi|kaufen|juniper|juegos|jprs|jpmorgan|joy|jot|joburg|jobs|jnj|jmp|jll|jlc|jio|jewelry|jetzt|' + 'jeep|jcp|jcb|java|jaguar|iwc|iveco|itv|itau|istanbul|ist|ismaili|iselect|irish|ipiranga|' + 'investments|intuit|international|intel|int|insure|insurance|institute|ink|ing|info|infiniti|' + 'industries|immobilien|immo|imdb|imamat|ikano|iinet|ifm|ieee|icu|ice|icbc|ibm|hyundai|hyatt|' + 'hughes|htc|hsbc|how|house|hotmail|hotels|hoteles|hot|hosting|host|hospital|horse|honeywell|' + 'honda|homesense|homes|homegoods|homedepot|holiday|holdings|hockey|hkt|hiv|hitachi|hisamitsu|' + 'hiphop|hgtv|hermes|here|helsinki|help|healthcare|health|hdfcbank|hdfc|hbo|haus|hangout|hamburg|' + 'hair|guru|guitars|guide|guge|gucci|guardian|group|grocery|gripe|green|gratis|graphics|grainger|' + 'gov|got|gop|google|goog|goodyear|goodhands|goo|golf|goldpoint|gold|godaddy|gmx|gmo|gmbh|gmail|' + 'globo|global|gle|glass|glade|giving|gives|gifts|gift|ggee|george|genting|gent|gea|gdn|gbiz|' + 'garden|gap|games|game|gallup|gallo|gallery|gal|fyi|futbol|furniture|fund|fun|fujixerox|fujitsu|' + 'ftr|frontier|frontdoor|frogans|frl|fresenius|free|fox|foundation|forum|forsale|forex|ford|' + 'football|foodnetwork|food|foo|fly|flsmidth|flowers|florist|flir|flights|flickr|fitness|fit|' + 'fishing|fish|firmdale|firestone|fire|financial|finance|final|film|fido|fidelity|fiat|ferrero|' + 'ferrari|feedback|fedex|fast|fashion|farmers|farm|fans|fan|family|faith|fairwinds|fail|fage|' + 'extraspace|express|exposed|expert|exchange|everbank|events|eus|eurovision|etisalat|esurance|' + 'estate|esq|erni|ericsson|equipment|epson|epost|enterprises|engineering|engineer|energy|emerck|' + 'email|education|edu|edeka|eco|eat|earth|dvr|dvag|durban|dupont|duns|dunlop|duck|dubai|dtv|drive|' + 'download|dot|doosan|domains|doha|dog|dodge|doctor|docs|dnp|diy|dish|discover|discount|directory|' + 'direct|digital|diet|diamonds|dhl|dev|design|desi|dentist|dental|democrat|delta|deloitte|dell|' + 'delivery|degree|deals|dealer|deal|dds|dclk|day|datsun|dating|date|data|dance|dad|dabur|cyou|' + 'cymru|cuisinella|csc|cruises|cruise|crs|crown|cricket|creditunion|creditcard|credit|courses|' + 'coupons|coupon|country|corsica|coop|cool|cookingchannel|cooking|contractors|contact|consulting|' + 'construction|condos|comsec|computer|compare|company|community|commbank|comcast|com|cologne|' + 'college|coffee|codes|coach|clubmed|club|cloud|clothing|clinique|clinic|click|cleaning|claims|' + 'cityeats|city|citic|citi|citadel|cisco|circle|cipriani|church|chrysler|chrome|christmas|chloe|' + 'chintai|cheap|chat|chase|channel|chanel|cfd|cfa|cern|ceo|center|ceb|cbs|cbre|cbn|cba|catholic|' + 'catering|cat|casino|cash|caseih|case|casa|cartier|cars|careers|career|care|cards|caravan|car|' + 'capitalone|capital|capetown|canon|cancerresearch|camp|camera|cam|calvinklein|call|cal|cafe|cab|' + 'bzh|buzz|buy|business|builders|build|bugatti|budapest|brussels|brother|broker|broadway|' + 'bridgestone|bradesco|box|boutique|bot|boston|bostik|bosch|boots|booking|book|boo|bond|bom|bofa|' + 'boehringer|boats|bnpparibas|bnl|bmw|bms|blue|bloomberg|blog|blockbuster|blanco|blackfriday|' + 'black|biz|bio|bingo|bing|bike|bid|bible|bharti|bet|bestbuy|best|berlin|bentley|beer|beauty|' + 'beats|bcn|bcg|bbva|bbt|bbc|bayern|bauhaus|basketball|baseball|bargains|barefoot|barclays|' + 'barclaycard|barcelona|bar|bank|band|bananarepublic|banamex|baidu|baby|azure|axa|aws|avianca|' + 'autos|auto|author|auspost|audio|audible|audi|auction|attorney|athleta|associates|asia|asda|arte|' + 'art|arpa|army|archi|aramco|arab|aquarelle|apple|app|apartments|aol|anz|anquan|android|analytics|' + 'amsterdam|amica|amfam|amex|americanfamily|americanexpress|alstom|alsace|ally|allstate|allfinanz|' + 'alipay|alibaba|alfaromeo|akdn|airtel|airforce|airbus|aigo|aig|agency|agakhan|africa|afl|' + 'afamilycompany|aetna|aero|aeg|adult|ads|adac|actor|active|aco|accountants|accountant|accenture|' + 'academy|abudhabi|abogado|able|abc|abbvie|abbott|abb|abarth|aarp|aaa|onion' + ')(?=[^0-9a-zA-Z@]|$))'));
    const validPunycode = /(?:xn--[\-0-9a-z]+)/;
    const validSubdomain = regexSupplant(/(?:(?:#{validDomainChars}(?:[_-]|#{validDomainChars})*)?#{validDomainChars}\.)/, {validDomainChars: validDomainChars});
    const validDomain = regexSupplant(/(?:#{validSubdomain}*#{validDomainName}(?:#{validGTLD}|#{validCCTLD}|#{validPunycode}))/, {
        validDomainName: validDomainName,
        validSubdomain: validSubdomain,
        validGTLD: validGTLD,
        validCCTLD: validCCTLD,
        validPunycode: validPunycode
    });
    const validPortNumber = /[0-9]+/;
    const cyrillicLettersAndMarks = /\u0400-\u04FF/;
    const latinAccentChars = /\xC0-\xD6\xD8-\xF6\xF8-\xFF\u0100-\u024F\u0253\u0254\u0256\u0257\u0259\u025B\u0263\u0268\u026F\u0272\u0289\u028B\u02BB\u0300-\u036F\u1E00-\u1EFF/;
    const validGeneralUrlPathChars = regexSupplant(/[a-z#{cyrillicLettersAndMarks}0-9!\*';:=\+,\.\$\/%#\[\]\-\u2013_~@\|&#{latinAccentChars}]/i, {
        cyrillicLettersAndMarks: cyrillicLettersAndMarks,
        latinAccentChars: latinAccentChars
    });

    const validAsciiDomain = regexSupplant(/(?:(?:[\-a-z0-9#{latinAccentChars}]+)\.)+(?:#{validGTLD}|#{validCCTLD}|#{validPunycode})/gi, {
        latinAccentChars: latinAccentChars,
        validGTLD: validGTLD,
        validCCTLD: validCCTLD,
        validPunycode: validPunycode
    });

    const MAX_DOMAIN_LABEL_LENGTH = 63;
    const PUNYCODE_ENCODED_DOMAIN_PREFIX = 'xn--';

    // This is an extremely lightweight implementation of domain name validation according to RFC 3490
    // Our regexes handle most of the cases well enough
    // See https://tools.ietf.org/html/rfc3490#section-4.1 for details
    const idna = {
        toAscii: function toAscii(domain: string) {
            if (domain.substring(0, 4) === PUNYCODE_ENCODED_DOMAIN_PREFIX && !domain.match(validAsciiDomain)) {
                // Punycode encoded url cannot contain non ASCII characters
                return false;
            }

            const labels = domain.split('.');
            for (let i = 0; i < labels.length; i++) {
                const label = labels[i];
                const punycodeEncodedLabel = PunyCode.toASCII(label);
                if (punycodeEncodedLabel.length < 1 || punycodeEncodedLabel.length > MAX_DOMAIN_LABEL_LENGTH) {
                    // DNS label has invalid length
                    return false;
                }
            }
            return labels.join('.');
        }
    };

    function isValidUrl(url: string, protocol: string, domain: string) {
        let urlLength = url.length;
        const punycodeEncodedDomain = idna.toAscii(domain);
        if (!punycodeEncodedDomain || !punycodeEncodedDomain.length) {
            return false;
        }

        urlLength = urlLength + punycodeEncodedDomain.length - domain.length;
        return protocol.length + urlLength <= MAX_URL_LENGTH;
    }

    const validUrlPrecedingChars = regexSupplant(/(?:[^A-Za-z0-9@＠$#＃#{invalidCharsGroup}]|^)/, {invalidCharsGroup: invalidCharsGroup});
    const validUrlQueryChars = /[a-z0-9!?\*'@\(\);:&=\+\$\/%#\[\]\-_\.,~|]/i;
    const validUrlBalancedParens = regexSupplant('\\(' + '(?:' + '#{validGeneralUrlPathChars}+' + '|' +
        // allow one nested level of balanced parentheses
        '(?:' + '#{validGeneralUrlPathChars}*' + '\\(' + '#{validGeneralUrlPathChars}+' + '\\)' + '#{validGeneralUrlPathChars}*' + ')' + ')' + '\\)', {validGeneralUrlPathChars: validGeneralUrlPathChars}, 'i');
    const validUrlPathEndingChars = regexSupplant(/[\+\-a-z#{cyrillicLettersAndMarks}0-9=_#\/#{latinAccentChars}]|(?:#{validUrlBalancedParens})/i, {
        cyrillicLettersAndMarks: cyrillicLettersAndMarks,
        latinAccentChars: latinAccentChars,
        validUrlBalancedParens: validUrlBalancedParens
    });

    // Allow @ in a url, but only in the middle. Catch things like http://example.com/@user/
    const validUrlPath = regexSupplant('(?:' + '(?:' + '#{validGeneralUrlPathChars}*' + '(?:#{validUrlBalancedParens}#{validGeneralUrlPathChars}*)*' + '#{validUrlPathEndingChars}' + ')|(?:@#{validGeneralUrlPathChars}+\/)' + ')', {
        validGeneralUrlPathChars: validGeneralUrlPathChars,
        validUrlBalancedParens: validUrlBalancedParens,
        validUrlPathEndingChars: validUrlPathEndingChars
    }, 'i');

    const validUrlQueryEndingChars = /[a-z0-9\-_&=#\/]/i;

    const extractUrl = regexSupplant('(' + // $1 total match
        '(#{validUrlPrecedingChars})' + // $2 Preceeding chracter
        '(' + // $3 URL
        '(https?:\\/\\/)?' + // $4 Protocol (optional)
        '(#{validDomain})' + // $5 Domain(s)
        '(?::(#{validPortNumber}))?' + // $6 Port number (optional)
        '(\\/#{validUrlPath}*)?' + // $7 URL Path
        '(\\?#{validUrlQueryChars}*#{validUrlQueryEndingChars})?' + // $8 Query String
        ')' + ')', {
        validUrlPrecedingChars: validUrlPrecedingChars,
        validDomain: validDomain,
        validPortNumber: validPortNumber,
        validUrlPath: validUrlPath,
        validUrlQueryChars: validUrlQueryChars,
        validUrlQueryEndingChars: validUrlQueryEndingChars
    }, 'gi');

    const validTcoUrl = /^https?:\/\/t\.co\/([a-z0-9]+)/i;
    const DEFAULT_PROTOCOL = 'https://';
    const DEFAULT_PROTOCOL_OPTIONS = {extractUrlsWithoutProtocol: true};
    const MAX_URL_LENGTH = 4096;
    const MAX_TCO_SLUG_LENGTH = 40;

    const invalidUrlWithoutProtocolPrecedingChars = /[-_.\/]$/;

    interface IUrl {
        url: string;
        indices: number[];
    }

    function extractUrlsWithIndices(text: string): IUrl[] {
        // tslint:disable-next-line:cyclomatic-complexity
        const options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : DEFAULT_PROTOCOL_OPTIONS;

        if (!text || (options.extractUrlsWithoutProtocol ? !text.match(/\./) : !text.match(/:/))) {
            return [];
        }

        const urls: IUrl[] = [];

        function _loop(): any {
            // tslint:disable-next-line:cyclomatic-complexity
            const before = RegExp.$2;
            let url = RegExp.$3;
            const protocol = RegExp.$4;
            const domain = RegExp.$5;
            const path = RegExp.$7;
            let endPosition = extractUrl.lastIndex;
            const startPosition = endPosition - url.length;

            if (!isValidUrl(url, protocol || DEFAULT_PROTOCOL, domain)) {
                return 'continue';
            }
            // extract ASCII-only domains.
            if (!protocol) {
                if (!options.extractUrlsWithoutProtocol || before.match(invalidUrlWithoutProtocolPrecedingChars)) {
                    return 'continue';
                }

                let lastUrl: IUrl = null;
                let asciiEndPosition = 0;
                domain.replace(validAsciiDomain, function (asciiDomain: string): any {
                    const asciiStartPosition = domain.indexOf(asciiDomain, asciiEndPosition);
                    asciiEndPosition = asciiStartPosition + asciiDomain.length;
                    lastUrl = {
                        url: asciiDomain,
                        indices: [startPosition + asciiStartPosition, startPosition + asciiEndPosition]
                    };
                    urls.push(lastUrl);
                });

                // no ASCII-only domain found. Skip the entire URL.
                if (lastUrl == null) {
                    return 'continue';
                }

                // lastUrl only contains domain. Need to add path and query if they exist.
                if (path) {
                    lastUrl.url = url.replace(domain, lastUrl.url);
                    lastUrl.indices[1] = endPosition;
                }
            } else {
                // In the case of t.co URLs, don't allow additional path characters.
                if (url.match(validTcoUrl)) {
                    const tcoUrlSlug = RegExp.$1;
                    if (tcoUrlSlug && tcoUrlSlug.length > MAX_TCO_SLUG_LENGTH) {
                        return 'continue';
                    } else {
                        url = RegExp.lastMatch;
                        endPosition = startPosition + url.length;
                    }
                }
                urls.push({
                    url: url,
                    indices: [startPosition, endPosition]
                });
            }
        }

        while (extractUrl.exec(text)) {
            const _ret = _loop();
            if (_ret === 'continue') continue;
        }

        return urls;
    }

    function getCharacterWeight(ch: string, options: IOption): number {
        const optionsDefaultWeight = options.defaultWeight;
        const optionsRanges = options.ranges;

        let weight = optionsDefaultWeight;
        const chCodePoint = ch.charCodeAt(0);
        if (Array.isArray(optionsRanges)) {
            for (let i = 0, length = optionsRanges.length; i < length; i++) {
                const currRange = optionsRanges[i];
                if (chCodePoint >= currRange.start && chCodePoint <= currRange.end) {
                    weight = currRange.weight;
                    break;
                }
            }
        }
        return weight;
    }
}
export default TwitterText;