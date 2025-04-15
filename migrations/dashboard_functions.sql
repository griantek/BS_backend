-- Function to get entity counts by type
CREATE OR REPLACE FUNCTION get_entity_counts()
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total', COUNT(*),
        'executive', SUM(CASE WHEN r.entity_type = 'Executive' THEN 1 ELSE 0 END),
        'editor', SUM(CASE WHEN r.entity_type = 'Editor' THEN 1 ELSE 0 END),
        'author', SUM(CASE WHEN r.entity_type = 'Author' THEN 1 ELSE 0 END),
        'admin', SUM(CASE WHEN r.entity_type = 'Admin' THEN 1 ELSE 0 END),
        'other', SUM(CASE WHEN r.entity_type NOT IN ('Executive', 'Editor', 'Author', 'Admin') OR r.entity_type IS NULL THEN 1 ELSE 0 END)
    ) INTO result
    FROM entities e
    LEFT JOIN roles r ON e.role = r.id
    WHERE e.is_deleted = FALSE;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get financial metrics
CREATE OR REPLACE FUNCTION get_financial_metrics()
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_revenue', COALESCE(SUM(amount), 0),
        'average_transaction_value', COALESCE(AVG(amount), 0)
    ) INTO result
    FROM transactions;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get journal status distribution
CREATE OR REPLACE FUNCTION get_journal_status_distribution()
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total', COUNT(*),
        'pending', SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END),
        'under_review', SUM(CASE WHEN status = 'under review' THEN 1 ELSE 0 END),
        'approved', SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END),
        'rejected', SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END),
        'submitted', SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END)
    ) INTO result
    FROM journal_data
    WHERE is_deleted = FALSE;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get top services by usage
CREATE OR REPLACE FUNCTION get_top_services()
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    WITH service_count AS (
        SELECT 
            s.id,
            s.service_name,
            COUNT(r.id) as count
        FROM services s
        JOIN registration r ON r.service_and_prices::jsonb @> jsonb_build_array(jsonb_build_object('id', s.id::text))
        WHERE r.is_deleted = FALSE
        GROUP BY s.id, s.service_name
        ORDER BY count DESC
        LIMIT 5
    )
    SELECT json_agg(
        json_build_object(
            'service_name', sc.service_name,
            'count', sc.count
        )
    ) INTO result
    FROM service_count sc;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;
