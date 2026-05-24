
CREATE OR REPLACE FUNCTION public.ma_generate_default_data_room(_asset_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
  rec record;
  defaults text[][] := ARRAY[
    ['domain',         'Domain ownership records'],
    ['brand',          'Brand files & trademarks'],
    ['ip',             'IP ownership documentation'],
    ['contracts',      'Core commercial contracts'],
    ['supplier',       'Supplier / freelancer assignments'],
    ['customer_data',  'Customer data map'],
    ['crm',            'CRM records export'],
    ['campaign_metrics','Campaign metrics history'],
    ['finance',        'Financial records (P&L, balance sheet)'],
    ['approval_logs',  'Founder approval logs'],
    ['agent_logs',     'Liftor agent execution logs'],
    ['compliance',     'Compliance evidence pack'],
    ['buyer_map',      'Buyer map & warm-up history'],
    ['valuation',      'Valuation assumptions & benchmarks'],
    ['other',          'Monthly performance reports']
  ];
  i integer;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role)) THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;

  FOR i IN 1 .. array_length(defaults, 1) LOOP
    PERFORM 1 FROM ma_data_room_items
      WHERE portfolio_asset_id = _asset_id
        AND item_name = defaults[i][2];
    IF NOT FOUND THEN
      INSERT INTO ma_data_room_items (portfolio_asset_id, item_category, item_name, status)
      VALUES (_asset_id, defaults[i][1]::ma_data_room_category, defaults[i][2], 'missing');
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  RETURN inserted_count;
END;
$$;
