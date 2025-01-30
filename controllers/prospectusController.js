const supabase = require('../supabaseClient');

exports.createProspectus = async (req, res) => {
    console.log('Request body:', req.body);
    const {
        clientEmail,
        clientId,
        clientName,
        date,
        department,
        otherDepartment,
        period,
        phone,
        proposedService,
        regId,
        requirement,
        state,
        techPerson,
    } = req.body;

    // Map the fields to match database schema
    const { data, error } = await supabase
        .from('prospectus')
        .insert([
            {
                date,
                email: clientEmail,
                executive_id: clientId,
                reg_id: regId,
                client_name: clientName,
                phone,
                department: otherDepartment || department, // Use otherDepartment if provided, else use department
                state,
                tech_person: techPerson,
                requirement,
                proposed_service_period: period,
                services: proposedService,
            },
        ])
        .select();

    if (error) {
        console.log('Error response:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    console.log('Success response:', data);
    res.status(201).json({
        success: true,
        message: "Prospectus created successfully",
        data: data[0],
        timestamp: new Date().toISOString()
    });
};

exports.getProspectus = async (req, res) => {    // Changed from getAllProspectus to getProspectus
    const { data, error } = await supabase.from('prospectus').select('*');

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(200).json(data);
};

exports.getProspectusByExecutiveId = async (req, res) => {
    const { executiveId } = req.params;

    const { data, error } = await supabase
        .from('prospectus')
        .select('*')
        .eq('executive_id', executiveId);

    if (error) {
        // console.log('Error fetching prospectus:', error);
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
};

exports.getProspectusByRegId = async (req, res) => {
    console.log('Request params:', req.params);
    const { regId } = req.params;

    const { data, error } = await supabase
        .from('prospectus')
        .select('*')
        .eq('reg_id', regId)
        .single(); // since reg_id should be unique

    if (error) {
        // console.log('Error fetching prospectus:', error);
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
};
