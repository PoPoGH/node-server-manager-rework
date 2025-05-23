/**
 * Module pour récupérer les informations géographiques des adresses IP
 */

const logger = require('../core/Logger');

class IpInfo {
    /**
     * Récupère les informations géographiques d'une adresse IP
     * @param {string} IPAddress - L'adresse IP à analyser (peut contenir un port)
     * @returns {Promise<Object|false>} - Les informations de localisation ou false en cas d'échec
     */    static async getInfo(IPAddress) {
        if (!IPAddress) {
            logger.warn(`Pas d'adresse IP fournie pour la récupération des informations géographiques`);
            return false;
        }        try {
            const ip = IPAddress.split(':')[0];
              // Détecter les IPs locales, privées ou invalides
            if (ip === '127.0.0.1' || ip === 'localhost' || ip === 'unknown' || !ip ||
                ip.startsWith('192.168.') || ip.startsWith('10.') || 
                (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) {
                logger.debug(`Adresse IP locale ou privée détectée: ${ip}. Tentative de récupération de l'IP publique...`);
                
                try {
                    // Récupérer l'IP publique du serveur
                    const publicIpResult = await fetch('https://api.ipify.org?format=json');
                    
                    if (publicIpResult.ok) {
                        const publicIpData = await publicIpResult.json();
                        const publicIp = publicIpData.ip;
                        logger.debug(`IP publique récupérée: ${publicIp}`);
                        
                        // Utiliser cette IP publique pour la géolocalisation
                        return await IpInfo.getGeoInfo(publicIp);
                    } else {
                        logger.error(`Impossible de récupérer l'IP publique`);
                    }
                } catch (publicIpError) {
                    logger.error(`Erreur lors de la récupération de l'IP publique: ${publicIpError.message}`);
                }
                
                // En cas d'échec, utiliser une valeur par défaut
                return {
                    ip: ip,
                    country: 'France', // Pays par défaut pour les connexions locales
                    countryCode: 'FR'  // Code pays par défaut
                };
            }
            
            logger.debug(`Récupération des informations géographiques pour l'IP: ${ip}`);
            
            const result = await fetch(`http://ip-api.com/json/${ip}`);
            
            if (!result.ok) {
                logger.error(`Erreur de l'API: ${result.status} ${result.statusText}`);
                return false;
            }
            
            const data = await result.json();
            
            if (data.status === 'fail' || !data.country) {
                logger.warn(`L'API n'a pas pu identifier le pays pour l'IP: ${ip}`);
                return {
                    ip: ip,
                    country: 'Unknown',
                    countryCode: 'XX'
                };
            }
            
            logger.info(`Informations géographiques récupérées pour ${ip}: ${data.country} (${data.countryCode})`);
            return data;
        } catch (error) {
            logger.error(`Erreur lors de la récupération des informations géographiques pour ${IPAddress}: ${error.message}`);
        }
          return false;
    }
    
    /**
     * Récupère les informations géographiques d'une adresse IP
     * @param {string} ip - L'adresse IP (sans port)
     * @returns {Promise<Object|false>} - Les informations de localisation ou false en cas d'échec
     */    static async getGeoInfo(ip) {
        try {
            logger.debug(`Récupération des informations géographiques pour l'IP publique: ${ip}`);
            
            const result = await fetch(`http://ip-api.com/json/${ip}`);
            
            if (!result.ok) {
                logger.error(`Erreur de l'API: ${result.status} ${result.statusText}`);
                return false;
            }
            
            const data = await result.json();
            
            if (data.status === 'fail' || !data.country) {
                logger.warn(`L'API n'a pas pu identifier le pays pour l'IP publique: ${ip}`);
                return {
                    ip: ip,
                    country: 'Unknown',
                    countryCode: 'XX'
                };
            }
            
            logger.info(`Informations géographiques récupérées pour IP publique ${ip}: ${data.country} (${data.countryCode})`);
            return data;
        } catch (error) {
            logger.error(`Erreur lors de la récupération des informations géographiques pour l'IP publique ${ip}: ${error.message}`);
            return {
                ip: ip,
                country: 'France', // Valeur par défaut en cas d'erreur
                countryCode: 'FR'
            };
        }
    }
}

module.exports = IpInfo;
