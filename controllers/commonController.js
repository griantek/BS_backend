const supabase = require('../supabaseClient');

//====================================
// Bank Account Controllers
//====================================
exports.getAllBankAccounts = async (req, res) => {
    console.log('Executing: getAllBankAccounts');

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

    res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
    });
};

exports.getBankAccountById = async (req, res) => {
    console.log('Executing: getBankAccountById');
    const { id } = req.params;

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

exports.createBankAccount = async (req, res) => {
    console.log('Executing: createBankAccount');
    const { 
        account_name,
        account_holder_name,
        account_number,
        ifsc_code,
        account_type,
        bank,
        upi_id,
        branch
    } = req.body;

    // Validate required fields
    if (!account_name || !account_holder_name || !account_number || !ifsc_code || !bank) {
        return res.status(400).json({
            success: false,
            error: 'Account name, holder name, account number, IFSC code, and bank are required',
            timestamp: new Date().toISOString()
        });
    }

    // Validate account type if provided
    if (account_type && !['Savings', 'Current', 'Other'].includes(account_type)) {
        return res.status(400).json({
            success: false,
            error: 'Account type must be Savings, Current, or Other',
            timestamp: new Date().toISOString()
        });
    }

    const { data, error } = await supabase
        .from('bank_accounts')
        .insert([{
            account_name,
            account_holder_name,
            account_number,
            ifsc_code,
            account_type,
            bank,
            upi_id,
            branch
        }])
        .select()
        .single();

    if (error) {
        console.log('Error creating bank account:', error);
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

exports.updateBankAccount = async (req, res) => {
    console.log('Executing: updateBankAccount');
    const { id } = req.params;
    const { 
        account_name,
        account_holder_name,
        account_number,
        ifsc_code,
        account_type,
        bank,
        upi_id,
        branch
    } = req.body;

    // Validate account type if provided
    if (account_type && !['Savings', 'Current', 'Other'].includes(account_type)) {
        return res.status(400).json({
            success: false,
            error: 'Account type must be Savings, Current, or Other',
            timestamp: new Date().toISOString()
        });
    }

    const { data, error } = await supabase
        .from('bank_accounts')
        .update({
            account_name,
            account_holder_name,
            account_number,
            ifsc_code,
            account_type,
            bank,
            upi_id,
            branch,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.log('Error updating bank account:', error);
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

exports.deleteBankAccount = async (req, res) => {
    console.log('Executing: deleteBankAccount');
    const { id } = req.params;

    // First check if bank account is used in any registrations
    const { data: registrations, error: checkError } = await supabase
        .from('registration')
        .select('id')
        .eq('bank_id', id);

    if (checkError) {
        console.log('Error checking registrations:', checkError);
        return res.status(400).json({
            success: false,
            error: 'Error checking for linked registrations',
            timestamp: new Date().toISOString()
        });
    }

    if (registrations && registrations.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Cannot delete bank account as it is linked to registrations',
            timestamp: new Date().toISOString()
        });
    }

    const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);

    if (error) {
        console.log('Error deleting bank account:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({
        success: true,
        message: 'Bank account deleted successfully',
        timestamp: new Date().toISOString()
    });
};

//====================================
// Services Controllers
//====================================
exports.getAllServices = async (req, res) => {
    console.log('Executing: getAllServices');

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

    res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
    });
};

exports.getServiceById = async (req, res) => {
    console.log('Executing: getServiceById');
    const { id } = req.params;

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
    console.log('Executing: createService');
    const { service_name, service_type, description, fee, min_duration, max_duration } = req.body;

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

exports.updateService = async (req, res) => {
    console.log('Executing: updateService');
    const { id } = req.params;
    const { 
        service_name, 
        service_type, 
        description, 
        fee, 
        min_duration, 
        max_duration 
    } = req.body;

    const { data, error } = await supabase
        .from('services')
        .update({
            service_name,
            service_type,
            description,
            fee,
            min_duration,
            max_duration,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.log('Error updating service:', error);
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

exports.deleteService = async (req, res) => {
    console.log('Executing: deleteService');
    const { id } = req.params;

    const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

    if (error) {
        console.log('Error deleting service:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({
        success: true,
        message: 'Service deleted successfully',
        timestamp: new Date().toISOString()
    });
};

//====================================
// Transaction Controllers
//====================================
exports.createTransaction = async (req, res) => {
    console.log('Executing: createTransaction');
    const {
        transaction_type,
        transaction_id,
        amount,
        transaction_date,
        additional_info,
        exec_id
    } = req.body;

    if (!transaction_type || !transaction_id || !transaction_date) {
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
            amount: amount || 0, // Set default to 0 if amount is null
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
    console.log('Executing: getAllTransactions');
    const { data, error } = await supabase
        .from('transactions')
        .select(`
            *,
            executive:exec_id(
                id,
                username
            ),
            registration:registration!transaction_id(
                id,
                prospectus:prospectus_id(
                    id,
                    client_name,
                    reg_id
                )
            )
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

    // Format the response to make it cleaner
    const formattedData = data.map(transaction => ({
        ...transaction,
        client_name: transaction.registration?.prospectus?.client_name || 'N/A',
        reg_id: transaction.registration?.prospectus?.reg_id || 'N/A',
        executive_name: transaction.executive?.username || 'N/A'
    }));

    res.status(200).json({
        success: true,
        data: formattedData,
        timestamp: new Date().toISOString()
    });
};

//====================================
// Modified Registration Controllers
//====================================
exports.getAllRegistrations = async (req, res) => {
    console.log('Executing: getAllRegistrations');

    const { data: registrations, error: registrationError } = await supabase
        .from('registration')
        .select(`
            *,
            prospectus:prospectus_id(
                id, 
                executive_id,
                client_name,
                reg_id,
                executive:executive_id(
                    id,
                    username,
                    email
                )
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
    console.log('Executing: getRegistrationById');
    const { id } = req.params;

    const { data, error } = await supabase
        .from('registration')
        .select(`
        *,
        prospectus:prospectus_id(*),
        bank_accounts:bank_id(*),
        transactions(*)
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
    console.log('Executing: createRegistration');
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
        assigned_to,
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
            amount: amount || 0, // Set default to 0 if amount is null
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
            assigned_to,
            transaction_id: transactionData.id,// Link to the created transaction
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
        .update({ isregistered: true })
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

exports.updateRegistration = async (req, res) => {
    console.log('Executing: updateRegistration');
    const { id } = req.params;

    // First get the current registration to get the transaction_id
    const { data: currentRegistration, error: fetchError } = await supabase
        .from('registration')
        .select('transaction_id')
        .eq('id', id)
        .single();

    if (fetchError || !currentRegistration) {
        console.log('Error fetching registration:', fetchError);
        return res.status(404).json({
            success: false,
            error: 'Registration not found',
            timestamp: new Date().toISOString()
        });
    }

    // Extract registration and transaction details from request body
    const {
        // Registration details
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
        
        // Transaction details
        transaction_type,
        transaction_id: external_transaction_id,
        amount,
        transaction_date,
        additional_info,
        exec_id
    } = req.body;

    // Update registration data
    const { data: registrationData, error: registrationError } = await supabase
        .from('registration')
        .update({
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
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (registrationError) {
        console.log('Error updating registration:', registrationError);
        return res.status(400).json({
            success: false,
            error: registrationError.message,
            timestamp: new Date().toISOString()
        });
    }

    // Update transaction data
    const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .update({
            transaction_type,
            transaction_id: external_transaction_id,
            amount: parseFloat(amount || 0),
            transaction_date,
            additional_info,
            exec_id,
            updated_at: new Date().toISOString()
        })
        .eq('id', currentRegistration.transaction_id)
        .select()
        .single();

    if (transactionError) {
        console.log('Error updating transaction:', transactionError);
        return res.status(400).json({
            success: false,
            error: transactionError.message,
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({
        success: true,
        data: {
            registration: registrationData,
            transaction: transactionData
        },
        timestamp: new Date().toISOString()
    });
};

exports.deleteRegistration = async (req, res) => {
    console.log('Executing: deleteRegistration');
    const { id } = req.params;

    // First get the registration to get transaction_id and prospectus_id
    const { data: registration, error: fetchError } = await supabase
        .from('registration')
        .select('transaction_id, prospectus_id')
        .eq('id', id)
        .single();

    if (fetchError) {
        console.log('Error fetching registration:', fetchError);
        return res.status(400).json({
            success: false,
            error: 'Error fetching registration details',
            timestamp: new Date().toISOString()
        });
    }

    if (!registration) {
        return res.status(404).json({
            success: false,
            error: 'Registration not found',
            timestamp: new Date().toISOString()
        });
    }

    // Delete the transaction first
    if (registration.transaction_id) {
        const { error: transactionError } = await supabase
            .from('transactions')
            .delete()
            .eq('id', registration.transaction_id);

        if (transactionError) {
            console.log('Error deleting transaction:', transactionError);
            return res.status(400).json({
                success: false,
                error: 'Error deleting associated transaction',
                timestamp: new Date().toISOString()
            });
        }
    }

    // Then delete the registration
    const { error: registrationError } = await supabase
        .from('registration')
        .delete()
        .eq('id', id);

    if (registrationError) {
        console.log('Error deleting registration:', registrationError);
        return res.status(400).json({
            success: false,
            error: registrationError.message,
            timestamp: new Date().toISOString()
        });
    }

    // Reset the prospectus isregistered status
    if (registration.prospectus_id) {
        const { error: prospectusError } = await supabase
            .from('prospectus')
            .update({ isregistered: false })
            .eq('id', registration.prospectus_id);

        if (prospectusError) {
            console.log('Error updating prospectus:', prospectusError);
            // Don't fail the request if this update fails
        }
    }

    res.status(200).json({
        success: true,
        message: 'Registration and associated transaction deleted successfully',
        timestamp: new Date().toISOString()
    });
};

exports.approveRegistration = async (req, res) => {
    console.log('Executing: approveRegistration');
    const { id } = req.params;
    
    console.log('Approve Registration Request Body:', JSON.stringify(req.body, null, 2));
    console.log('Registration ID:', id);

    // First get the current registration to get the transaction_id
    const { data: currentRegistration, error: fetchError } = await supabase
        .from('registration')
        .select('transaction_id')
        .eq('id', id)
        .single();

    if (fetchError || !currentRegistration) {
        console.log('Error fetching registration:', fetchError);
        return res.status(404).json({
            success: false,
            error: 'Registration not found',
            timestamp: new Date().toISOString()
        });
    }

    // Update registration status and assigned_to
    const { data: registrationData, error: registrationError } = await supabase
        .from('registration')
        .update({ 
            status: 'registered',
            assigned_to: req.body.assigned_to || null  // Add this line
        })
        .eq('id', id)
        .select()
        .single();

    if (registrationError) {
        console.log('Error updating registration:', registrationError);
        return res.status(400).json({
            success: false,
            error: registrationError.message,
            timestamp: new Date().toISOString()
        });
    }

    // Update the transaction with new details
    const {
        transaction_type,
        transaction_id: external_transaction_id,
        amount,
        transaction_date,
        additional_info,
        exec_id
    } = req.body;

    // Update the transaction with new details
    const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .update({
            transaction_type,
            transaction_id: external_transaction_id,
            amount: parseFloat(amount || 0),
            transaction_date,
            additional_info,
            exec_id,
            updated_at: new Date().toISOString()
        })
        .eq('id', currentRegistration.transaction_id)
        .select()
        .single();

    if (transactionError) {
        console.log('Error updating transaction:', transactionError);
        return res.status(400).json({
            success: false,
            error: transactionError.message,
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({
        success: true,
        message: 'Registration approved successfully',
        data: {
            registration: registrationData,
            transaction: transactionData
        },
        timestamp: new Date().toISOString()
    });
};

//====================================
// Department Controllers
//====================================
exports.getAllDepartments = async (req, res) => {
    console.log('Executing: getAllDepartments');

    const { data, error } = await supabase
        .from('departments')
        .select(`
            *
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.log('Error fetching departments:', error);
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

exports.getDepartmentById = async (req, res) => {
    console.log('Executing: getDepartmentById');
    const { id } = req.params;

    const { data, error } = await supabase
        .from('departments')
        .select(`
            *,
            executive:exec_id(id, username)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.log('Error fetching department:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    if (!data) {
        return res.status(404).json({
            success: false,
            error: 'Department not found',
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString()
    });
};

exports.createDepartment = async (req, res) => {
    console.log('Executing: createDepartment');
    const { name, exec_id } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            error: 'Department name is required',
            timestamp: new Date().toISOString()
        });
    }

    const { data, error } = await supabase
        .from('departments')
        .insert([{
            name,
            exec_id: exec_id || 'supAdmin'
        }])
        .select()
        .single();

    if (error) {
        console.log('Error creating department:', error);
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

exports.updateDepartment = async (req, res) => {
    console.log('Executing: updateDepartment');
    const { id } = req.params;
    const { name, exec_id } = req.body;

    const { data, error } = await supabase
        .from('departments')
        .update({
            name,
            exec_id: exec_id || 'supAdmin',
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.log('Error updating department:', error);
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

exports.deleteDepartment = async (req, res) => {
    console.log('Executing: deleteDepartment');
    const { id } = req.params;

    const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

    if (error) {
        console.log('Error deleting department:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({
        success: true,
        message: 'Department deleted successfully',
        timestamp: new Date().toISOString()
    });
};
