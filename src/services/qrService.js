const QRCode = require('qrcode');

class QRService {
    /**
     * Matndan QR kod rasm yaratish
     * @param {string} text 
     * @returns {Promise<Buffer>} PNG formatda rasm buffer
     */
    async generate(text) {
        try {
            const buffer = await QRCode.toBuffer(text, {
                type: 'png',
                width: 400,
                margin: 2,
                color: {
                    dark: '#0B1F3A', // Navy color for texnikum branding
                    light: '#ffffff'
                }
            });
            return { success: true, buffer };
        } catch (error) {
            console.error('QR generation error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new QRService();
