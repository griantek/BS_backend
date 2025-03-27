const supabase = require('../utils/supabaseClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { decryptText, encryptText } = require('../utils/encryption');

exports.getAssignedRegistrations = async (req, res) => {
    console.log('Executing: getAssignedRegistrations');
    const { executive_id } = req.params;

    try {
        // Get registrations with joined prospectus data in a single query
        const { data: registrations, error: registrationError } = await supabase
            .from('registration')
            .select(`
                *,
                prospectus:prospectus_id(
                    id, 
                    client_name, 
                    reg_id, 
                    requirement, 
                    email,
                    phone,
                    department,
                    state,
                    tech_person,
                    entity:entity_id (
                        id,
                        username,
                        email
                    )
                )
            `)
            .eq('assigned_to', executive_id)
            .eq('status', 'registered')
            .eq('journal_added', false);
            
        if (registrationError) throw registrationError;
        
        if (!registrations || registrations.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                timestamp: new Date().toISOString()
            });
        }
        
        // The data is already in the format we need from the joined query
        res.status(200).json({
            success: true,
            data: registrations,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching assigned registrations:', error);
        res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};