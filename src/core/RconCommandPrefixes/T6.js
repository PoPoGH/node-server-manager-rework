module.exports = {
    Rcon: {        prefix: '\xff\xff\xff\xffrcon %PASSWORD% %COMMAND%',
        status: 'status',
        getDvar: '%DVAR%',
        setDvar: 'set %DVAR% %VALUE%',
        clientKick: `clientkick_for_reason %CLIENT% "%REASON%"`,
        Tell: `tell %CLIENT% "%MESSAGE%"`,
        Say: `say "%MESSAGE%"`,
        // Expression régulière améliorée pour mieux capturer les joueurs dans T6
        statusRegex: /^ *([0-9]+) +([0-9]+) +([0-9]+) +([0-9]+) +((?:[A-Za-z0-9]){1,32}|bot[0-9]+|(?:[[A-Za-z0-9]+)) *(.{0,32}) +([0-9]+) +(\d+\.\d+\.\d+.\d+\:-*\d{1,5}|0+.0+:-*\d{1,5}|loopback|unknown|bot) +(-*[0-9]+) +([0-9]+) *$/g,
        // Expression régulière améliorée pour les variables avec plus de formats possibles
        // T6 peut simplement renvoyer la valeur brute, ou avoir plusieurs formats de réponse
        dvarRegex: /(?:(.*?) +(?:is:|is|:) +\"?(.*?)\"?$|print\n(.*?)$|^"?(.*?)"?$)/g,
          // Fonction spéciale pour nettoyer les valeurs retournées par les serveurs T6
        cleanDvarValue: (value) => {
            if (!value) return value;
            
            // Retirer les guillemets au début et à la fin
            let cleaned = value.trim();
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                cleaned = cleaned.substring(1, cleaned.length - 1);
            }
            
            // Format 1 : "nom_du_dvar" is: "valeur"
            if (cleaned.includes('" is: "')) {
                const parts = cleaned.split('" is: "');
                if (parts.length > 1) {
                    cleaned = parts[1].replace(/"/g, '');
                }
            }
            
            // Format 2 : "valeur" default: "xxx" Domain is any text
            // Retirer la partie "default: xxx" et tout ce qui suit
            const defaultPos = cleaned.indexOf(' default:');
            if (defaultPos !== -1) {
                cleaned = cleaned.substring(0, defaultPos);
            }
            
            // Retirer la partie "Domain is any text" si présente
            const domainPos = cleaned.indexOf('Domain is');
            if (domainPos !== -1) {
                cleaned = cleaned.substring(0, domainPos);
            }
            
            // Nettoyer les codes couleurs CoD (^7, etc.)
            cleaned = cleaned.replace(/\^[0-9]/g, '');
            
            return cleaned.trim();
        },
        parseStatus: (match) => {
            // Tenter de convertir le GUID correctement, avec gestion des cas particuliers T6
            let guid = match[5];
            try {
                if (guid && !isNaN(parseInt(guid, 16))) {
                    guid = parseInt(guid, 16).toString();
                }
            } catch (e) {
                // Si la conversion échoue, conserver la valeur originale
            }
            
            return {
                num: match[1],
                score: match[2],
                bot: match[3],
                ping: match[4],
                guid: guid,
                name: match[6] ? match[6].replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), ``) : '',
                lastmgs: match[7],
                address: match[8],
                qport: match[9],
                rate: match[10]
            }
        },
        // Délai entre les commandes pour éviter de surcharger le serveur T6
        commandDelay: 300 
    },
    getInfo: '\xff\xff\xff\xffgetinfo',
    getStatus: '\xff\xff\xff\xffgetstatus',
    Dvars: {
        maxclients: 'sv_maxclients',
        mapname: 'mapname',        // Nom de la carte actuelle
        map: 'map',                // Alternative pour le nom de la carte
        hostname: 'sv_hostname',   // Nom du serveur
        gametype: 'g_gametype',    // Type de jeu principal
        altGametype: 'gametype',   // Type de jeu alternatif (parfois utilisé dans T6)
        gamename: 'gamename',      // Nom du jeu (généralement "T6")
        maprotation: 'sv_mapRotation',
        messagelength: 104,
        maxSayLength: 100
    },
    EventPatterns: {
        // Player connection events
        connect: /J;([^;]+);([^;]+);([^;]+)/, // J;id;guid;name
        disconnect: /Q;([^;]+);([^;]+);([^;]+)/, // Q;id;guid;name
        
        // Chat messages
        say: /say;([^;]+);([^;]+);([^;]+);(.+)/, // say;id;guid;name;message
        
        // Kill events
        kill: /K;([^;]+);([^;]+);([^;]+);([^;]+);([^;]+)/ // K;killer_id;killer_name;victim_id;victim_name;weapon
    }
}
