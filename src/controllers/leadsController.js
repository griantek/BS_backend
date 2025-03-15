const supabase = require('../utils/supabaseClient');

// Get all leads
exports.getAllLeads = async (req, res) => {
    console.log('Executing: getAllLeads');
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('id', { ascending: false });

        if (error) {
            console.log('Error fetching leads:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getAllLeads:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

// Get a lead by ID
exports.getLeadById = async (req, res) => {
    console.log('Executing: getLeadById');
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.log('Error fetching lead:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found',
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getLeadById:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

// Create a new lead
exports.createLead = async (req, res) => {
    console.log('Executing: createLead');
    try {
        const {
            lead_source,
            client_name,
            contact_number,
            country,
            state,
            main_subject,
            service,
            requirements,
            customer_remarks,
            registration_date
        } = req.body;

        // Validate required fields based on the schema
        if (!lead_source || !contact_number || !country || !main_subject || !service || !requirements) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                timestamp: new Date().toISOString()
            });
        }

        const { data, error } = await supabase
            .from('leads')
            .insert([{
                lead_source,
                date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
                client_name,
                contact_number,
                country,
                state,
                main_subject,
                service,
                requirements,
                customer_remarks,
                registration_date: registration_date || null
            }])
            .select();

        if (error) {
            console.log('Error creating lead:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        res.status(201).json({
            success: true,
            data: data[0],
            message: 'Lead created successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in createLead:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

// Update a lead
exports.updateLead = async (req, res) => {
    console.log('Executing: updateLead');
    const { id } = req.params;
    const {
        lead_source,
        client_name,
        contact_number,
        country,
        state,
        main_subject,
        service,
        requirements,
        customer_remarks,
        registration_date
    } = req.body;

    try {
        // Build update object with only provided fields
        const updateData = {};
        
        if (lead_source !== undefined) updateData.lead_source = lead_source;
        if (client_name !== undefined) updateData.client_name = client_name;
        if (contact_number !== undefined) updateData.contact_number = contact_number;
        if (country !== undefined) updateData.country = country;
        if (state !== undefined) updateData.state = state;
        if (main_subject !== undefined) updateData.main_subject = main_subject;
        if (service !== undefined) updateData.service = service;
        if (requirements !== undefined) updateData.requirements = requirements;
        if (customer_remarks !== undefined) updateData.customer_remarks = customer_remarks;
        if (registration_date !== undefined) updateData.registration_date = registration_date;

        const { data, error } = await supabase
            .from('leads')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) {
            console.log('Error updating lead:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found',
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data: data[0],
            message: 'Lead updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in updateLead:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

// Delete a lead
exports.deleteLead = async (req, res) => {
    console.log('Executing: deleteLead');
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', id);

        if (error) {
            console.log('Error deleting lead:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lead deleted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in deleteLead:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

// Get leads by service
exports.getLeadsByService = async (req, res) => {
    console.log('Executing: getLeadsByService');
    const { service } = req.params;

    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('service', service)
            .order('id', { ascending: false });

        if (error) {
            console.log('Error fetching leads by service:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getLeadsByService:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

// Get leads by source
exports.getLeadsBySource = async (req, res) => {
    console.log('Executing: getLeadsBySource');
    const { source } = req.params;

    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('lead_source', source)
            .order('id', { ascending: false });

        if (error) {
            console.log('Error fetching leads by source:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getLeadsBySource:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};
