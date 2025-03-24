const supabase = require('../utils/supabaseClient');

// Get all leads
exports.getAllLeads = async (req, res) => {
    console.log('Executing: getAllLeads');
    try {
        // Filter by authenticated user ID
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('leads')
            .select(`
                *
            `)
            .eq('created_by', userId)
            .order('date', { ascending: false });

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

exports.getAllUnapprovedLeads = async (req, res) => {
    console.log('Executing: getAllUnapprovedLeads');
    try {
        // Filter by authenticated user ID
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('leads')
            .select(`
                *
            `)
            .eq('created_by', userId)
            .or('prospectus_type.is.null,prospectus_type.neq.Prospect')
            .or('followup_status.is.null,followup_status.neq.converted')
            .order('date', { ascending: false });

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
    const userId = req.user.id;

    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('id', id)
            .eq('created_by', userId)  // Only return if created by this user
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
    console.log('Executing: createLead',);
    try {
        const {
            lead_source,
            client_name,
            phone_number,
            domain,
            research_area,
            title,
            degree,
            university,
            state,
            country,
            requirement,
            detailed_requirement,
            prospectus_type,
            followup_date,
            remarks,
            created_by,
            assigned_to
        } = req.body;

        // Validate required fields based on the schema
        if (!lead_source || !phone_number || !requirement) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: lead_source, phone_number, and requirement are mandatory',
                timestamp: new Date().toISOString()
            });
        }

        const { data, error } = await supabase
            .from('leads')
            .insert([{
                date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
                lead_source,
                client_name,
                phone_number,
                domain,
                research_area,
                title,
                degree,
                university,
                state,
                country,
                requirement,
                detailed_requirement,
                prospectus_type,
                followup_date,
                remarks,
                created_by: created_by || req.user?.id, // Get from the authenticated user if not provided
                assigned_to,
                attended: false,
                followup_status: 'pending'
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
    const updateData = { ...req.body };
    
    // Remove any fields that aren't in the table schema
    const allowedFields = [
        'lead_source', 'client_name', 'phone_number', 'domain', 'research_area',
        'title', 'degree', 'university', 'state', 'country', 'requirement', 
        'detailed_requirement', 'prospectus_type', 'followup_date', 'remarks',
        'assigned_to', 'attended', 'followup_status'
    ];
    
    // Filter to only include allowed fields
    const filteredUpdateData = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
            obj[key] = updateData[key];
            return obj;
        }, {});

    try {
        const { data, error } = await supabase
            .from('leads')
            .update(filteredUpdateData)
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

// Update lead status fields
exports.updateLeadStatus = async (req, res) => {
    console.log('Executing: updateLeadStatus');
    const { id } = req.params;
    const userId = req.user.id;
    
    // Extract only the allowed status fields
    const { 
        prospectus_type,
        followup_date,
        remarks,
        followup_status
    } = req.body;
    
    // Build the update object with only provided fields
    const updateData = {};
    if (prospectus_type !== undefined) updateData.prospectus_type = prospectus_type;
    if (followup_date !== undefined) updateData.followup_date = followup_date;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (followup_status !== undefined) updateData.followup_status = followup_status;
    
    // If no valid fields provided, return an error
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
            success: false,
            error: 'No valid status fields provided for update',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // First verify the lead belongs to this user
        const { data: leadData, error: leadError } = await supabase
            .from('leads')
            .select('id')
            .eq('id', id)
            .eq('created_by', userId)
            .single();
            
        if (leadError || !leadData) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found or you do not have permission to update it',
                timestamp: new Date().toISOString()
            });
        }
        
        // Update the lead status
        const { data, error } = await supabase
            .from('leads')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) {
            console.log('Error updating lead status:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data: data[0],
            message: 'Lead status updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in updateLeadStatus:', error);
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

// Get leads by domain
exports.getLeadsByDomain = async (req, res) => {
    console.log('Executing: getLeadsByDomain');
    const { domain } = req.params;
    const userId = req.user.id;

    try {
        const { data, error } = await supabase
            .from('leads')
            .select(`
                *
            `)
            .eq('domain', domain)
            .eq('created_by', userId)  // Only return leads created by this user
            .order('date', { ascending: false });

        if (error) {
            console.log('Error fetching leads by domain:', error);
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
        console.error('Error in getLeadsByDomain:', error);
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
    const userId = req.user.id;

    try {
        const { data, error } = await supabase
            .from('leads')
            .select(`
                *
            `)
            .eq('lead_source', source)
            .eq('created_by', userId)  // Only return leads created by this user
            .order('date', { ascending: false });

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

// Get leads with follow-up date of today and past due
exports.getLeadsByFollowup = async (req, res) => {
    console.log('Executing: getLeadsByTodayFollowup');
    
    try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('leads')
            .select(`
            *
            `)
            .lte('followup_date', today)  // Less than or equal to today's date (includes past due)
            .eq('created_by', userId)
            .neq('prospectus_type', 'Prospect')
            .eq('followup_status', 'pending')
            .order('followup_date', { ascending: true });  // Changed to followup_date for better chronological sorting

        if (error) {
            console.log('Error fetching today\'s and past due follow-up leads:', error);
            return res.status(400).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data,
            count: data.length,
            today: today,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getLeadsByTodayFollowup:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

// Get leads assigned to a specific entity
exports.getLeadsByAssignee = async (req, res) => {
    console.log('Executing: getLeadsByAssignee');
    const { assignee_id } = req.params;

    try {
        const { data, error } = await supabase
            .from('leads')
            .select(`
                *
            `)
            .eq('assigned_to', assignee_id)
            .order('followup_date', { ascending: true });

        if (error) {
            console.log('Error fetching leads by assignee:', error);
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
        console.error('Error in getLeadsByAssignee:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

// Assign lead to an entity
exports.assignLead = async (req, res) => {
    console.log('Executing: assignLead');
    const { id } = req.params;
    const { assigned_to } = req.body;

    if (!assigned_to) {
        return res.status(400).json({
            success: false,
            error: 'Assignment ID is required',
            timestamp: new Date().toISOString()
        });
    }

    try {
        const { data, error } = await supabase
            .from('leads')
            .update({ 
                assigned_to,
                followup_status: 'assigned'
            })
            .eq('id', id)
            .select();

        if (error) {
            console.log('Error assigning lead:', error);
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
            message: 'Lead assigned successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in assignLead:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};

// Approve a lead and convert it to a prospectus
exports.approveLeadToProspectus = async (req, res) => {
    console.log('Executing: approveLeadToProspectus');
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        // First, fetch the lead data
        const { data: leadData, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', id)
            .eq('created_by', userId)
            .single();
            
        if (leadError || !leadData) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found or you do not have permission to approve it',
                timestamp: new Date().toISOString()
            });
        }
        
        // Extract data from request body for prospectus
        const { 
            email,
            reg_id,
            tech_person,
            proposed_service_period,
            services,
            notes,
            assigned_to,
            leads_id
        } = req.body;
        
        // Validate required fields
        if (!email || !reg_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: email and reg_id are mandatory',
                timestamp: new Date().toISOString()
            });
        }
        
        // Create the prospectus record
        const { data: prospectusData, error: prospectusError } = await supabase
            .from('prospectus')
            .insert([{
                entity_id: assigned_to ,
                date: new Date().toISOString().split('T')[0], // Current date
                email,
                reg_id,
                client_name: leadData.client_name,
                phone: leadData.phone_number,
                department: leadData.domain,
                state: leadData.state,
                tech_person,
                requirement: leadData.requirement,
                proposed_service_period,
                services,
                notes,
                next_follow_up: leadData.followup_date,
                isregistered: false,
                leads_id: leads_id,
            }])
            .select();
        
        if (prospectusError) {
            console.log('Error creating prospectus:', prospectusError);
            return res.status(400).json({
                success: false,
                error: prospectusError.message,
                timestamp: new Date().toISOString()
            });
        }
        
        // Update the lead's status
        const { data: updatedLeadData, error: updateLeadError } = await supabase
            .from('leads')
            .update({
                prospectus_type: 'Prospect',
                followup_status: 'converted',
                attended: true,
                remarks: 'Registered'
            })
            .eq('id', id)
            .select();
            
        if (updateLeadError) {
            console.log('Error updating lead status after conversion:', updateLeadError);
            // Not returning here as the prospectus was already created
        }
        
        res.status(200).json({
            success: true,
            data: {
                prospectus: prospectusData[0],
                lead: updatedLeadData ? updatedLeadData[0] : leadData
            },
            message: 'Lead successfully converted to prospectus',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in approveLeadToProspectus:', error);
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
};
