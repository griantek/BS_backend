const supabase = require('../supabaseClient');

//====================================
// Bank Account Controllers
//====================================
exports.getAllBankAccounts = async (req, res) => {
    console.log('Fetching bank accounts');

    const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.log('Error fetching bank accounts:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    // console.log(`Found ${data?.length || 0} bank accounts`);
    res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
    });
};

exports.getBankAccountById = async (req, res) => {
    const { id } = req.params;
    console.log(`Fetching bank account with id: ${id}`);

    const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.log('Error fetching bank account:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    if (!data) {
        return res.status(404).json({
            success: false,
            error: 'Bank account not found',
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
    });
};

//====================================
// Services Controllers
//====================================
exports.getAllServices = async (req, res) => {
    console.log('Fetching all services');

    const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.log('Error fetching services:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    // console.log(`Found ${data?.length || 0} services`);
    res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
    });
};

exports.getServiceById = async (req, res) => {
    const { id } = req.params;
    console.log(`Fetching service with id: ${id}`);

    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.log('Error fetching service:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    if (!data) {
        return res.status(404).json({
            success: false,
            error: 'Service not found',
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
    });
};

exports.createService = async (req, res) => {
    const { service_name, service_type, description, fee, min_duration, max_duration } = req.body;
    console.log('Creating new service');

    if (!service_name || !fee) {
        return res.status(400).json({
            success: false,
            error: 'Service name and fee are required',
            timestamp: new Date().toISOString()
        });
    }

    const { data, error } = await supabase
        .from('services')
        .insert([{
            service_name,
            service_type,
            description,
            fee,
            min_duration,
            max_duration
        }])
        .select()
        .single();

    if (error) {
        console.log('Error creating service:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    res.status(201).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
    });
};

//====================================
// Registration Controllers
//====================================
exports.getAllRegistrations = async (req, res) => {
    console.log('Fetching all registrations');

    const { data, error } = await supabase
        .from('registration')
        .select(`
            *,
            prospectus:prospectus_id(id, company_name),
            bank_accounts:bank_id(id, bank_name)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.log('Error fetching registrations:', error);
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

exports.getRegistrationById = async (req, res) => {
    const { id } = req.params;
    console.log(`Fetching registration with id: ${id}`);

    const { data, error } = await supabase
        .from('registration')
        .select(`
            *,
            prospectus:prospectus_id(id, company_name),
            bank_accounts:bank_id(id, bank_name)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.log('Error fetching registration:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    if (!data) {
        return res.status(404).json({
            success: false,
            error: 'Registration not found',
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
    });
};

exports.createRegistration = async (req, res) => {
    const {
        prospectus_id,
        services,
        init_amount,
        accept_amount,
        discount,
        total_amount,
        accept_period,
        pub_period,
        bank_id,
        status,
        month,
        year
    } = req.body;

    if (!prospectus_id || !init_amount || !total_amount || !status || !month || !year) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            timestamp: new Date().toISOString()
        });
    }

    const { data, error } = await supabase
        .from('registration')
        .insert([{
            prospectus_id,
            services,
            init_amount,
            accept_amount,
            discount,
            total_amount,
            accept_period,
            pub_period,
            bank_id,
            status,
            month,
            year
        }])
        .select()
        .single();

    if (error) {
        console.log('Error creating registration:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    res.status(201).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
    });
};

exports.deleteRegistration = async (req, res) => {
    const { id } = req.params;
    console.log(`Deleting registration with id: ${id}`);

    const { error } = await supabase
        .from('registration')
        .delete()
        .eq('id', id);

    if (error) {
        console.log('Error deleting registration:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({
        success: true,
        message: 'Registration deleted successfully',
        timestamp: new Date().toISOString()
    });
};
