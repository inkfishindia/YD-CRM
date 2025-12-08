
import React, { useState } from 'react';
import { Badge } from './ui/Badge';
import { 
  Users, Building2, Store, ShoppingBag, Truck, 
  MoreHorizontal, Mail, Phone, MapPin, Globe, 
  ExternalLink, Calendar, DollarSign, Package,
  ChevronDown, ChevronUp, Save, MessageSquare, AlertTriangle, 
  Search, Filter, CheckCircle2, XCircle, ArrowRight, User, Tag, Database, Activity
} from 'lucide-react';
import { Lead } from '../types';
import { Button } from './ui/Button';

// --- GENERIC TABLE COMPONENT ---
const ModuleTable = ({ 
  headers, 
  rows, 
  renderCell 
}: { 
  headers: string[], 
  rows: any[], 
  renderCell: (row: any, key: string) => React.ReactNode 
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-200">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-6 py-3 tracking-wider">{h}</th>
              ))}
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                {headers.map((h, i) => (
                  <td key={i} className="px-6 py-3 whitespace-nowrap">
                    {renderCell(row, h)}
                  </td>
                ))}
                <td className="px-6 py-3 text-right">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- CONTACT ROW COMPONENT (Expandable) ---
const ContactRow: React.FC<{ 
  lead: Lead; 
  onUpdate: (lead: Lead) => void; 
}> = ({ lead, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState<Lead>(lead);
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = () => {
    onUpdate(formData);
    setIsDirty(false);
  };

  const handleChange = (field: keyof Lead, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };
  
  return (
    <>
      <tr 
        onClick={() => setExpanded(!expanded)} 
        className={`
          group cursor-pointer transition-colors border-l-4
          ${expanded ? 'bg-blue-50/30 border-l-blue-500 shadow-sm' : 'hover:bg-gray-50 border-l-transparent hover:border-l-gray-300'}
        `}
      >
        {/* 1. Identity */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border ${
              lead.status === 'Won' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-600 border-gray-200'
            }`}>
              {(lead.contactPerson || lead.companyName || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm truncate max-w-[180px]">{lead.contactPerson || 'Unknown Contact'}</div>
              <div className="text-xs text-gray-500 truncate max-w-[180px]">{lead.companyName || 'No Company'}</div>
            </div>
          </div>
        </td>

        {/* 2. Communication */}
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1 text-xs">
            {lead.number ? (
              <a href={`tel:${lead.number}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600">
                <Phone size={12} className="text-gray-400" /> {lead.number}
              </a>
            ) : <span className="text-red-300 flex items-center gap-1"><AlertTriangle size={10}/> No Phone</span>}
            
            {lead.email ? (
              <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600">
                <Mail size={12} className="text-gray-400" /> {lead.email}
              </a>
            ) : <span className="text-gray-300 italic">No Email</span>}
          </div>
        </td>

        {/* 3. Segment (City, Source, Score) */}
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1 text-xs">
             <div className="flex items-center gap-2 text-gray-600">
                 <MapPin size={12} className="text-gray-400"/> {lead.city || 'Unknown City'}
             </div>
             <div className="flex items-center gap-2 text-gray-500">
                 <Database size={12} className="text-gray-400"/> {lead.source || 'Manual'}
             </div>
             {lead.leadScore && (
                 <div className="flex items-center gap-1 text-blue-600 font-bold mt-0.5">
                     <Activity size={10}/> Score: {lead.leadScore}
                 </div>
             )}
          </div>
        </td>

        {/* 4. Status */}
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
                <Badge variant={lead.status === 'Won' ? 'success' : lead.status === 'Lost' ? 'neutral' : 'info'}>
                {lead.status}
                </Badge>
            </div>
            <span className="text-[10px] text-gray-400 font-medium pl-1">
              Owner: {lead.ydsPoc || 'Unassigned'}
            </span>
          </div>
        </td>

        {/* 5. Value & Category */}
        <td className="px-4 py-3 text-right">
          <div className="flex flex-col items-end gap-0.5">
             {lead.category && <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 rounded">{lead.category}</span>}
             <span className="font-bold text-gray-900 text-sm">{(lead.estimatedQty || 0).toLocaleString()} Units</span>
          </div>
        </td>

        <td className="px-4 py-3 text-right">
          {expanded ? <ChevronUp size={18} className="text-blue-500 inline-block" /> : <ChevronDown size={18} className="text-gray-300 inline-block" />}
        </td>
      </tr>

      {/* EXPANDED DRAWER */}
      {expanded && (
        <tr>
          <td colSpan={6} className="p-0 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row bg-gray-50 border-t border-gray-100 shadow-inner animate-fade-in">
              
              {/* SECTION 1: IDENTITY (LEFT) */}
              <div className="w-full lg:w-1/3 p-6 border-r border-gray-200 space-y-4">
                <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-2">
                  <User size={14} className="text-blue-500"/> Identity & Contact
                </h4>
                
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">Company / Account Name</label>
                    <input 
                      className="w-full text-sm border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500" 
                      value={formData.companyName} 
                      onChange={(e) => handleChange('companyName', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Contact Person</label>
                      <input 
                        className="w-full text-sm border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500" 
                        value={formData.contactPerson} 
                        onChange={(e) => handleChange('contactPerson', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Location (City)</label>
                      <input 
                        className="w-full text-sm border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500" 
                        value={formData.city} 
                        onChange={(e) => handleChange('city', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Phone</label>
                      <input 
                        className="w-full text-sm border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500" 
                        value={formData.number} 
                        onChange={(e) => handleChange('number', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Email</label>
                      <input 
                        className="w-full text-sm border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500" 
                        value={formData.email} 
                        onChange={(e) => handleChange('email', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">Lead Source</label>
                        <select 
                        className="w-full text-sm border-gray-300 rounded px-2 py-1.5 bg-white"
                        value={formData.source}
                        onChange={(e) => handleChange('source', e.target.value)}
                        >
                        <option value="Vendor">Vendor</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Referral">Referral</option>
                        <option value="Cold Call">Cold Call</option>
                        <option value="Website">Website</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">Lead Score</label>
                        <input 
                        className="w-full text-sm border-gray-300 rounded px-2 py-1.5 bg-white"
                        value={formData.leadScore || ''}
                        onChange={(e) => handleChange('leadScore', e.target.value)}
                        placeholder="e.g. 85"
                        />
                    </div>
                  </div>
                  <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Tags</label>
                      <input 
                        className="w-full text-sm border-gray-300 rounded px-2 py-1.5 bg-white"
                        value={formData.tags || ''}
                        onChange={(e) => handleChange('tags', e.target.value)}
                        placeholder="Comma separated tags"
                      />
                  </div>
                </div>
              </div>

              {/* SECTION 2: FLOW & STRATEGY (RIGHT) */}
              <div className="w-full lg:w-2/3 p-6 space-y-4 bg-white/50">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-2">
                    <Building2 size={14} className="text-indigo-500"/> Lead Flows & Strategy
                  </h4>
                  {isDirty && (
                    <span className="text-xs text-amber-600 font-bold animate-pulse">Unsaved Changes</span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Flow Status */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-700">Pipeline Stage</span>
                      <Badge variant="info">{formData.status}</Badge>
                    </div>
                    <select 
                      className="w-full text-sm border-gray-300 rounded px-2 py-2 mb-3 bg-gray-50 focus:bg-white"
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Won">Won</option>
                      <option value="Lost">Lost</option>
                    </select>
                    
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">Category</label>
                        <select 
                          className="w-full text-xs border-gray-300 rounded px-2 py-1.5"
                          value={formData.category || 'Customisation'}
                          onChange={(e) => handleChange('category', e.target.value)}
                        >
                          <option value="Customisation">Customisation</option>
                          <option value="B2B">B2B</option>
                          <option value="POD">POD</option>
                          <option value="Dropshipping">Dropshipping</option>
                          <option value="Sampling">Sampling</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">Contact Status</label>
                        <input 
                          className="w-full text-xs border-gray-300 rounded px-2 py-1.5"
                          value={formData.contactStatus || ''}
                          onChange={(e) => handleChange('contactStatus', e.target.value)}
                          placeholder="Active..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Commercials */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-700">Commercials</span>
                      <span className="text-xs text-green-600 font-mono font-bold">Est. Value</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">Quantity</label>
                        <input 
                          type="number"
                          className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                          value={formData.estimatedQty}
                          onChange={(e) => handleChange('estimatedQty', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">Product</label>
                        <input 
                          className="w-full text-sm border-gray-300 rounded px-2 py-1.5"
                          value={formData.productType}
                          onChange={(e) => handleChange('productType', e.target.value)}
                          placeholder="e.g. Hoodie"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                       <label className="text-[10px] font-bold text-gray-400 block mb-1">Next Action</label>
                       <input 
                          className="w-full text-sm border-orange-200 bg-orange-50 rounded px-2 py-1.5 text-orange-800 placeholder-orange-300"
                          value={formData.nextAction}
                          onChange={(e) => handleChange('nextAction', e.target.value)}
                          placeholder="What's next?"
                       />
                    </div>
                  </div>
                </div>

                {/* Strategy Note */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1 flex items-center gap-1">
                    <MessageSquare size={10} /> Remarks / Description
                  </label>
                  <textarea 
                    className="w-full text-sm border-gray-300 rounded px-3 py-2 h-20 resize-none focus:ring-2 focus:ring-blue-500"
                    value={formData.remarks}
                    onChange={(e) => handleChange('remarks', e.target.value)}
                    placeholder="Enter notes, description or background..."
                  />
                </div>

                {/* Action Bar */}
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                  <Button variant="secondary" size="sm" onClick={() => setExpanded(false)}>Cancel</Button>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={handleSave} 
                    disabled={!isDirty} 
                    icon={<Save size={14}/>}
                    className={isDirty ? "bg-blue-600 hover:bg-blue-700 shadow-md" : "opacity-50"}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// --- 1. CONTACTS VIEW (Optimized) ---
interface ContactsViewProps {
  leads: Lead[];
  onUpdateLead?: (lead: Lead) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ leads, onUpdateLead }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Stats
  const total = leads.length;
  const active = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').length;
  const value = leads.reduce((acc, l) => acc + (l.estimatedQty || 0), 0);
  const urgent = leads.filter(l => !l.nextAction || l.priority === '🔴 High').length;

  const filteredLeads = leads.filter(l => {
    const matchesSearch = (l.companyName || '').toLowerCase().includes(search.toLowerCase()) || 
                          (l.contactPerson || '').toLowerCase().includes(search.toLowerCase()) ||
                          (l.city || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'All' ? true : (l.category || '') === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto pb-24">
      
      {/* 1. Dashboard Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Contacts</span>
          <span className="text-2xl font-bold text-gray-900">{total}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active Flows</span>
          <span className="text-2xl font-bold text-blue-600">{active}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pipeline Volume</span>
          <span className="text-2xl font-bold text-green-600">{value.toLocaleString()} u</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/50 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Needs Attention</span>
          <span className="text-2xl font-bold text-red-600">{urgent}</span>
        </div>
      </div>

      {/* 2. Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 shrink-0">
            <Users className="text-blue-500" /> Contacts
          </h2>
          <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input 
              className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all"
              placeholder="Search people, companies, cities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter size={14} />
            <select 
              className="bg-transparent border-none font-bold text-gray-700 focus:ring-0 cursor-pointer"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="B2B">B2B</option>
              <option value="Dropshipping">Dropshipping</option>
              <option value="POD">POD</option>
              <option value="Customisation">Customisation</option>
            </select>
          </div>
          <Button icon={<ArrowRight size={14}/>} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            Add New
          </Button>
        </div>
      </div>

      {/* 3. Main Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-[25%]">Identity</th>
              <th className="px-4 py-3 w-[20%]">Contact Info</th>
              <th className="px-4 py-3 w-[20%]">Segment (City/Source)</th>
              <th className="px-4 py-3 w-[15%]">Status / Owner</th>
              <th className="px-4 py-3 w-[15%] text-right">Value / Cat</th>
              <th className="px-4 py-3 w-[5%]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLeads.map((lead) => (
              <ContactRow 
                key={lead.leadId} 
                lead={lead} 
                onUpdate={(updated) => onUpdateLead && onUpdateLead(updated)} 
              />
            ))}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No contacts found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- 2. ACCOUNTS VIEW ---
export const AccountsView: React.FC = () => {
  const headers = ['Company', 'Type', 'City', 'Primary Contact', 'Total Value'];
  const data = [
    { name: 'Creative Studio', type: 'Agency', city: 'Mumbai', contact: 'Riya Sharma', value: '₹1.2L' },
    { name: 'Urban Threads', type: 'Dropship Brand', city: 'Bangalore', contact: 'Aman Jain', value: '₹45k' },
    { name: 'Local Cafe Merch', type: 'SME', city: 'Delhi', contact: 'Sarah Lee', value: '₹85k' },
    { name: 'Stark Industries', type: 'Enterprise', city: 'Mumbai', contact: 'Tony S', value: '₹5.5L' },
  ];

  const render = (row: any, key: string) => {
    if (key === 'Company') return (
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-gray-100 rounded-lg">
          <Building2 size={16} className="text-gray-500"/>
        </div>
        <span className="font-bold text-gray-900">{row.name}</span>
      </div>
    );
    if (key === 'Type') return <Badge variant="neutral">{row.type}</Badge>;
    if (key === 'City') return <span className="flex items-center gap-1 text-gray-500"><MapPin size={12}/> {row.city}</span>;
    if (key === 'Total Value') return <span className="font-mono font-bold text-green-700">{row.value}</span>;
    return <span>{row.contact}</span>;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="text-indigo-500" /> Accounts
          </h2>
          <p className="text-sm text-gray-500">Companies and brand entities.</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700">Add Account</button>
      </div>
      <ModuleTable headers={headers} rows={data} renderCell={render} />
    </div>
  );
};

// --- 3. STORES VIEW ---
export const StoresView: React.FC = () => {
  const headers = ['Store Name', 'Platform', 'URL', 'Status', 'Integration'];
  const data = [
    { name: 'Drip Culture', platform: 'Shopify', url: 'dripculture.in', status: 'Active', integ: 'Connected' },
    { name: 'Vibe Check', platform: 'WooCommerce', url: 'vibecheck.store', status: 'Onboarding', integ: 'Pending' },
    { name: 'Retro Fits', platform: 'Wix', url: 'retrofits.com', status: 'Inactive', integ: 'Disconnected' },
  ];

  const render = (row: any, key: string) => {
    if (key === 'Store Name') return <span className="font-bold text-gray-900">{row.name}</span>;
    if (key === 'Platform') return (
      <div className="flex items-center gap-2">
        <Store size={14} className="text-gray-400"/> {row.platform}
      </div>
    );
    if (key === 'URL') return <a href={`https://${row.url}`} className="text-blue-500 hover:underline flex items-center gap-1 text-xs"><Globe size={10}/> {row.url} <ExternalLink size={8}/></a>;
    if (key === 'Status') return <Badge variant={row.status === 'Active' ? 'success' : row.status === 'Onboarding' ? 'warning' : 'neutral'}>{row.status}</Badge>;
    if (key === 'Integration') return (
      <span className={`text-xs font-bold flex items-center gap-1 ${row.integ === 'Connected' ? 'text-green-600' : 'text-gray-400'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${row.integ === 'Connected' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
        {row.integ}
      </span>
    );
    return null;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="text-purple-500" /> Stores
          </h2>
          <p className="text-sm text-gray-500">Connected Dropshipping and POD storefronts.</p>
        </div>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700">Connect Store</button>
      </div>
      <ModuleTable headers={headers} rows={data} renderCell={render} />
    </div>
  );
};

// --- 4. PRODUCTS VIEW ---
export const ProductsView: React.FC = () => {
  const headers = ['SKU', 'Product Name', 'Category', 'Base Cost', 'Stock Status'];
  const data = [
    { sku: 'TS-BLK-001', name: 'Premium Cotton Tee - Black', category: 'Apparel', cost: '₹280', stock: 'In Stock' },
    { sku: 'HD-NVY-002', name: 'Heavyweight Hoodie - Navy', category: 'Apparel', cost: '₹650', stock: 'Low Stock' },
    { sku: 'CP-WHT-003', name: 'Dad Hat - White', category: 'Accessories', cost: '₹150', stock: 'In Stock' },
    { sku: 'TB-CAN-004', name: 'Canvas Tote Bag', category: 'Accessories', cost: '₹90', stock: 'Out of Stock' },
  ];

  const render = (row: any, key: string) => {
    if (key === 'SKU') return <span className="font-mono text-xs text-gray-500">{row.sku}</span>;
    if (key === 'Product Name') return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400">
          <ShoppingBag size={14} />
        </div>
        <span className="font-medium text-gray-900">{row.name}</span>
      </div>
    );
    if (key === 'Stock Status') return <Badge variant={row.stock === 'In Stock' ? 'success' : row.stock === 'Low Stock' ? 'warning' : 'danger'}>{row.stock}</Badge>;
    return <span>{row[key === 'Base Cost' ? 'cost' : key.toLowerCase()]}</span>;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-orange-500" /> Products
          </h2>
          <p className="text-sm text-gray-500">Master catalog and SKU management.</p>
        </div>
        <div className="flex gap-2">
            <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50">Import CSV</button>
            <button className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-orange-700">Add Product</button>
        </div>
      </div>
      <ModuleTable headers={headers} rows={data} renderCell={render} />
    </div>
  );
};

// --- 5. ORDERS VIEW ---
export const OrdersView: React.FC = () => {
  const headers = ['Order ID', 'Customer', 'Date', 'Amount', 'Fulfillment', 'Payment'];
  const data = [
    { id: '#ORD-9921', cust: 'Riya Sharma', date: 'Oct 24, 2024', amt: '₹12,400', fulfill: 'Shipped', pay: 'Paid' },
    { id: '#ORD-9922', cust: 'Aman Jain', date: 'Oct 25, 2024', amt: '₹2,100', fulfill: 'Processing', pay: 'Paid' },
    { id: '#ORD-9923', cust: 'Sarah Lee', date: 'Oct 25, 2024', amt: '₹5,600', fulfill: 'Pending', pay: 'Unpaid' },
  ];

  const render = (row: any, key: string) => {
    if (key === 'Order ID') return <span className="font-mono font-bold text-blue-600 hover:underline cursor-pointer">{row.id}</span>;
    if (key === 'Date') return <span className="text-gray-500 text-xs flex items-center gap-1"><Calendar size={10}/> {row.date}</span>;
    if (key === 'Fulfillment') return (
      <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
        row.fulfill === 'Shipped' ? 'bg-green-50 text-green-700 border-green-100' :
        row.fulfill === 'Processing' ? 'bg-blue-50 text-blue-700 border-blue-100' :
        'bg-gray-100 text-gray-600 border-gray-200'
      }`}>
        {row.fulfill}
      </span>
    );
    if (key === 'Payment') return <Badge variant={row.pay === 'Paid' ? 'success' : 'danger'}>{row.pay}</Badge>;
    return <span>{row[key === 'Amount' ? 'amt' : key === 'Customer' ? 'cust' : '']}</span>;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="text-teal-500" /> Orders & Fulfillment
          </h2>
          <p className="text-sm text-gray-500">Track production and shipping status.</p>
        </div>
        <button className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-teal-700">Create Order</button>
      </div>
      <ModuleTable headers={headers} rows={data} renderCell={render} />
    </div>
  );
};
