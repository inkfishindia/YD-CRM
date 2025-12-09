
export const INTAKE_SOURCES = {
  commerce: {
    name: 'Commerce',
    sheetId: '1UVP93fwaqxjX3TW3P6i0Uax4XeSUr2I1YZQgsJFBzm0',
    tab: 'Auto New Lead',
    color: 'blue',
    icon: 'ShoppingCart',
    mappings: {
      'Business Name': { field: 'companyName', transform: 'titleCase', required: true, target: 'Leads' },
      'Full name': { field: 'contactPerson', transform: 'titleCase', required: false, target: 'Leads' },
      'Phone': { field: 'number', transform: 'normalizePhone', required: true, target: 'Leads' },
      'Email': { field: 'email', transform: 'lowerCase', required: false, target: 'Leads' },
      'City': { field: 'city', transform: 'titleCase', required: false, target: 'Leads' },
      'source_row_id': { field: 'sourceRowId', transform: 'none', required: false, target: 'Leads' },
      'Lead Status': { field: 'stage', transform: 'none', required: false, target: 'LEAD_FLOWS' },
      'YDS Comments': { field: 'notes', transform: 'none', required: false, target: 'LEAD_FLOWS' },
      'Where': { field: 'productType', transform: 'none', required: false, target: 'LEAD_FLOWS' }
    },
    writebackColumns: {
      'yds_lead_id': null,
      'crm_status': null,
      'crm_processed_at': null,
      'crm_processed_by': null
    }
  },
  
  dropship: {
    name: 'Dropship',
    sheetId: '1kJa4O-yMvcmueR2rQEK8Vze12-bf5o0t3ketLReLMx0',
    tab: 'DS_leads',
    color: 'purple',
    icon: 'Package',
    mappings: {
      'Company / brand': { field: 'companyName', transform: 'titleCase', required: true, target: 'Leads' },
      'Lead Name': { field: 'contactPerson', transform: 'titleCase', required: false, target: 'Leads' },
      'Phone / WhatsApp': { field: 'number', transform: 'normalizePhone', required: true, target: 'Leads' },
      'Email': { field: 'email', transform: 'lowerCase', required: false, target: 'Leads' },
      'Source_Lead_id': { field: 'sourceRowId', transform: 'none', required: false, target: 'Leads' },
      'Requirement (verbatim)': { field: 'notes', transform: 'none', required: false, target: 'LEAD_FLOWS' },
      'Lead category': { field: 'category', transform: 'none', required: false, target: 'LEAD_FLOWS' },
      'YDC - Status': { field: 'stage', transform: 'none', required: false, target: 'LEAD_FLOWS' },
      'Allocated to': { field: 'owner', transform: 'none', required: false, target: 'LEAD_FLOWS' }
    },
    writebackColumns: {
      'yds_lead_id': null,
      'crm_status': null,
      'crm_processed_at': null,
      'crm_processed_by': null
    }
  },
  
  tkw: {
    name: 'TKW',
    sheetId: '1sImoVXLvVlv3_LONrDZLm-auzZPJsAE1NmAbxgz3MHU',
    tab: 'TKW Lead sheet',
    color: 'green',
    icon: 'Users',
    mappings: {
      'company_name': { field: 'companyName', transform: 'titleCase', required: true, target: 'Leads' },
      'Contact person': { field: 'contactPerson', transform: 'titleCase', required: false, target: 'Leads' },
      'NUMBER': { field: 'number', transform: 'normalizePhone', required: true, target: 'Leads' },
      'email': { field: 'email', transform: 'lowerCase', required: false, target: 'Leads' },
      'city': { field: 'city', transform: 'titleCase', required: false, target: 'Leads' },
      'lead_id': { field: 'sourceRowId', transform: 'none', required: false, target: 'Leads' },
      'Est Qty': { field: 'estimatedQty', transform: 'parseInt', required: false, target: 'LEAD_FLOWS' },
      'product_type': { field: 'productType', transform: 'none', required: false, target: 'LEAD_FLOWS' },
      'print_type': { field: 'printType', transform: 'none', required: false, target: 'LEAD_FLOWS' },
      'Priority': { field: 'priority', transform: 'none', required: false, target: 'LEAD_FLOWS' },
      'Category': { field: 'category', transform: 'none', required: false, target: 'LEAD_FLOWS' },
      'YDS - POC': { field: 'owner', transform: 'none', required: false, target: 'LEAD_FLOWS' },
      'REMARKS': { field: 'notes', transform: 'none', required: false, target: 'LEAD_FLOWS' },
      'Stage': { field: 'stage', transform: 'none', required: false, target: 'LEAD_FLOWS' },
      'Contact Status': { field: 'contactStatus', transform: 'none', required: false, target: 'LEAD_FLOWS' },
      'Payment Update': { field: 'paymentUpdate', transform: 'none', required: false, target: 'LEAD_FLOWS' }
    },
    writebackColumns: {
      'yds_lead_id': null,
      'crm_status': null,
      'crm_processed_at': null,
      'crm_processed_by': null
    }
  }
};
