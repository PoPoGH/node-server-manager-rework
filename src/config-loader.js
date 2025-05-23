/**
 * Chargeur de configuration pour Node Server Manager
 */

const path = require('path');
const fs = require('fs');

// Chemin du fichier de configuration principal
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'default.json');

// Charger la configuration
function loadConfig() {
    try {
        // Vérifier si le fichier existe
        if (!fs.existsSync(CONFIG_PATH)) {
            console.log(`Configuration non trouvée, création d'une configuration par défaut...`);
            createDefaultConfig();
        }
        
        // Charger la configuration depuis le fichier JSON
        const configData = fs.readFileSync(CONFIG_PATH);
        const config = JSON.parse(configData);
        
        // Fusionner avec les variables d'environnement
        mergeEnvironmentVariables(config);
        
        // Charger la localisation
        loadLocalization(config);
        
        // Valider la configuration
        validateConfig(config);
        
        return config;
    } catch (error) {
        console.error(`Erreur lors du chargement de la configuration: ${error.message}`);
        process.exit(1);
    }
}

// Fusionner avec les variables d'environnement
function mergeEnvironmentVariables(config) {
    // Définir l'environnement à partir de NODE_ENV
    config.env = process.env.NODE_ENV || 'production';
    
    // Remplacer les valeurs par les variables d'environnement si elles existent
    if (process.env.API_PORT) config.api.port = parseInt(process.env.API_PORT);
    if (process.env.API_SECRET) config.api.secret = process.env.API_SECRET;
    if (process.env.DB_PATH) config.db.path = process.env.DB_PATH;
    if (process.env.WEB_PORT) config.web.port = parseInt(process.env.WEB_PORT);
    if (process.env.LOCALE) config.localization.default = process.env.LOCALE;
}

// Création de la configuration par défaut
function createDefaultConfig() {
    try {
        // S'assurer que le répertoire de configuration existe
        const configDir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        // Configuration par défaut avec un tableau de serveurs vide
        const defaultConfig = {
            "servers": [],
            "api": {
                "port": 3001,
                "secret": "change_this_secret_key",
                "tokenExpiry": "24h",
                "rateLimit": {
                    "windowMs": 900000,
                    "max": 300
                }
            },
            "db": {
                "path": "data/database.sqlite"
            },
            "web": {
                "enabled": true,
                "port": 8080,
                "hostname": "localhost"
            },
            "localization": {
                "default": "fr"
            },
            "logging": {
                "level": "info",
                "file": "logs/server.log",
                "console": true,
                "maxSize": "10m",
                "maxFiles": 5
            }
        };
        
        // Écrire la configuration par défaut dans le fichier
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf8');
        console.log(`Configuration par défaut créée à ${CONFIG_PATH}`);
    } catch (error) {
        console.error(`Erreur lors de la création de la configuration par défaut: ${error.message}`);
        process.exit(1);
    }
}

// Charger les fichiers de localisation
function loadLocalization(config) {
    const locale = config.localization.default || 'fr';
    const localeFile = path.join(__dirname, '..', 'config', 'localization', `${locale}.json`);
    
    try {
        if (fs.existsSync(localeFile)) {
            const localeData = fs.readFileSync(localeFile);
            config.localization.strings = JSON.parse(localeData);
        } else {
            console.warn(`Attention: Fichier de localisation ${localeFile} non trouvé. Utilisation des textes par défaut.`);
            config.localization.strings = {};
        }
    } catch (error) {
        console.warn(`Attention: Erreur lors du chargement de la localisation: ${error.message}`);
        config.localization.strings = {};
    }
}

// Valider la configuration
function validateConfig(config) {
    // Vérifier les valeurs essentielles
    if (!config.api || !config.api.port) {
        throw new Error('Configuration invalide: api.port manquante');
    }
    
    if (!config.db || !config.db.path) {
        throw new Error('Configuration invalide: db.path manquante');
    }
    
    // Définir les valeurs par défaut si nécessaire
    if (!config.logging) config.logging = {};
    if (!config.logging.level) config.logging.level = 'info';
    if (!config.logging.file) config.logging.file = 'logs/server.log';
    if (config.logging.console === undefined) config.logging.console = true;
    
    // Normaliser les chemins
    config.db.path = path.normalize(config.db.path);
    config.logging.file = path.normalize(config.logging.file);
}

// Exporter la configuration chargée
module.exports = loadConfig();
