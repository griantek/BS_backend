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
// Transaction Controllers
//====================================
exports.createTransaction = async (req, res) => {
    const {
        transaction_type,
        transaction_id,
        amount,
        transaction_date,
        additional_info,
        exec_id
    } = req.body;

    if (!transaction_type || !transaction_id || !amount || !transaction_date) {
        return res.status(400).json({
            success: false,
            error: 'Missing required transaction fields',
            timestamp: new Date().toISOString()
        });
    }

    const { data, error } = await supabase
        .from('transactions')
        .insert([{
            transaction_type,
            transaction_id,
            amount,
            transaction_date,
            additional_info,
            exec_id
        }])
        .select()
        .single();

    if (error) {
        console.log('Error creating transaction:', error);
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

exports.getAllTransactions = async (req, res) => {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
            *,
            executive:exec_id(id, username)
        `)
        .order('transaction_date', { ascending: false });

    if (error) {
        console.log('Error fetching transactions:', error);
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

//====================================
// Modified Registration Controllers
//====================================
exports.getAllRegistrations = async (req, res) => {
    console.log('Fetching all registrations with complete data');

    // First get all registrations with their related data
    const { data: registrations, error: registrationError } = await supabase
        .from('registration')
        .select(`
            *,
            prospectus:prospectus_id(
                id, 
                client_name,
                reg_id
            ),
            bank_accounts:bank_id(
                bank,
                account_number
            ),
            transactions:transaction_id(
                id,
                transaction_type,
                transaction_id,
                amount,
                exec_id
            )
        `)
        .order('created_at', { ascending: false });

    if (registrationError) {
        console.log('Error fetching registrations:', registrationError);
        return res.status(400).json({
            success: false,
            error: registrationError.message,
            timestamp: new Date().toISOString()
        });
    }

    // Format the response
    const formattedData = {
        total: registrations.length,
        filtered: registrations.length,
        items: registrations.map(reg => ({
            // Registration data
            id: reg.id,
            prospectus_id: reg.prospectus_id,
            services: reg.services,
            init_amount: reg.init_amount,
            accept_amount: reg.accept_amount,
            discount: reg.discount,
            total_amount: reg.total_amount,
            accept_period: reg.accept_period,
            pub_period: reg.pub_period,
            status: reg.status,
            month: reg.month,
            year: reg.year,
            created_at: reg.created_at,
            
            // Related data
            prospectus: reg.prospectus,
            bank_account: reg.bank_accounts,
            transaction: reg.transactions
        }))
    };

    res.status(200).json({
        success: true,
        data: formattedData,
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
        // Transaction details
        transaction_type,
        transaction_id: external_transaction_id, // rename to avoid confusion
        amount,
        transaction_date,
        additional_info,
        exec_id,
        
        // Registration details
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
        year,
        notes
    } = req.body;

    // First, create the transaction
    const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
            transaction_type,
            transaction_id: external_transaction_id,
            amount,
            transaction_date,
            additional_info,
            exec_id
        }])
        .select()
        .single();

    if (transactionError) {
        console.log('Error creating transaction:', transactionError);
        return res.status(400).json({
            success: false,
            error: transactionError.message,
            timestamp: new Date().toISOString()
        });
    }

    // Then, create the registration with the transaction ID
    const { data: registrationData, error: registrationError } = await supabase
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
            year,
            transaction_id: transactionData.id ,// Link to the created transaction
            notes,
        }])
        .select()
        .single();

    if (registrationError) {
        console.log('Error creating registration:', registrationError);
        // You might want to delete the transaction if registration fails
        await supabase
            .from('transactions')
            .delete()
            .eq('id', transactionData.id);

        return res.status(400).json({
            success: false,
            error: registrationError.message,
            timestamp: new Date().toISOString()
        });
    }

    // Update the prospectus isRegistered status
    const { error: prospectusError } = await supabase
        .from('prospectus')
        .update({ isRegistered: true })
        .eq('id', prospectus_id);

    if (prospectusError) {
        console.log('Error updating prospectus:', prospectusError);
        // You might want to handle this error differently since the registration was successful
        // Maybe just log it or send a notification but don't fail the request
    }

    res.status(201).json({
        success: true,
        data: {
            registration: registrationData,
            transaction: transactionData
        },
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
