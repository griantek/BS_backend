const crypto = require('crypto');

const algorithm = process.env.ENCRYPTION_ALGORITHM;
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const iv = Buffer.from(process.env.ENCRYPTION_IV, 'hex');

const decryptText = (text) => {
    try {
        if (!text) return '';

        // Convert hex string to bytes
        const encryptedBytes = Buffer.from(text, 'hex');

        // Create decipher with auto padding disabled
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAutoPadding(false);

        // Decrypt
        let decrypted;
        try {
            decrypted = decipher.update(encryptedBytes);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            // Remove space padding manually (similar to Python implementation)
            while (decrypted.length > 0 && decrypted[decrypted.length - 1] === 32) { // 32 is ASCII for space
                decrypted = decrypted.slice(0, -1);
            }

            const result = decrypted.toString('utf8');
            return result;
        } catch (cryptoError) {
            const decipherAuto = crypto.createDecipheriv(algorithm, key, iv);
            let decryptedAuto = decipherAuto.update(encryptedBytes);
            decryptedAuto = Buffer.concat([decryptedAuto, decipherAuto.final()]);
            const resultAuto = decryptedAuto.toString('utf8').trim();
            return resultAuto;
        }
    } catch (error) {
        console.error('Final decryption error:', error);
        return text;
    }
};

const encryptText = (text) => {
    try {
        if (!text) return '';

        // Convert text to bytes
        const textBytes = Buffer.from(text, 'utf8');
        
        // Add padding to match Python implementation
        const padSize = 16 - (textBytes.length % 16);
        const paddedText = Buffer.concat([textBytes, Buffer.alloc(padSize, 32)]); // 32 is ASCII for space

        // Create cipher
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        cipher.setAutoPadding(false); // Disable auto padding as we do it manually

        // Encrypt
        const encrypted = Buffer.concat([cipher.update(paddedText), cipher.final()]);
        return encrypted.toString('hex');
    } catch (error) {
        console.error('Encryption error:', error);
        return text;
    }
};

module.exports = { decryptText, encryptText };
