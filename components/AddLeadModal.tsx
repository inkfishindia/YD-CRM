

import React, { useState } from 'react';
import { Lead, AppOptions, formatDate, toInputDate, fromInputDate } from '../types';
import { Modal } from './ui/Modal';
import { Input, Select, Textarea } from './ui/Form';
import { Button } from './ui/Button';
import { User, ShoppingBag, MapPin } from 'lucide-react';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Partial<Lead>) => Promise<void>;
  appOptions: AppOptions;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, onSave, appOptions }) => {
  const generateId = () => {
      const date = new Date();
      const prefix = 'LEAD';
      const timestamp = date.getTime().toString().slice(-6);
      return `${prefix}-${timestamp}`;
  };

  const [formData, setFormData] = useState<Partial<Lead>>({
    leadId: generateId(),
    date: formatDate(), // DD/MM/YY
    createdAt: formatDate(),
    source: 'TKW',
    employeeName: '',
    companyName: '',
    contactPerson: '',
    number: '',
    email: '',
    city: '',
    orderInfo: '',
    estimatedQty: 0,
    productType: '',
    printType: '',
    category: 'Customisation',
    ydsPoc: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.companyName) return; // Basic validation
    setIsSubmitting(true);
    await onSave(formData);
    setIsSubmitting(false);
    onClose();
    // Reset form with new ID
    setFormData({
        leadId: generateId(),
        date: formatDate(),
        createdAt: formatDate(),
        source: 'TKW',
        category: 'Customisation',
        estimatedQty: 0,
        companyName: '',
        contactPerson: '',
        number: '',
        email: '',
        city: '',
        orderInfo: '',
        productType: '',
        printType: '',
        ydsPoc: ''
    });
  };

  const handleChange = (field: keyof Lead, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create New Lead"
        footer={
            <Button 
                onClick={handleSubmit} 
                isLoading={isSubmitting} 
                className="w-full"
                disabled={!formData.companyName}
            >
                Create Lead
            </Button>
        }
    >
        <div className="space-y-6">
             {/* Section 1: Basic Info */}
             <div className="space-y-4">
                 <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-1">
                     <User size={14} /> Client Details
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="Date"
                        type="date"
                        value={toInputDate(formData.date)}
                        onChange={(e) => handleChange('date', fromInputDate(e.target.value))}
                    />
                    <Select
                        label="Source"
                        value={formData.source}
                        onChange={(e) => handleChange('source', e.target.value)}
                        options={appOptions.sources}
                    />
                </div>

                <Input
                    label="Company / Client Name *"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="e.g. Acme Corp"
                    required
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Contact Person"
                        value={formData.contactPerson}
                        onChange={(e) => handleChange('contactPerson', e.target.value)}
                        placeholder="Full Name"
                    />
                    <Input
                        label="Phone Number"
                        type="tel"
                        value={formData.number}
                        onChange={(e) => handleChange('number', e.target.value)}
                        placeholder="+91..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Email Address"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="name@example.com"
                    />
                    <Input
                        label="City / Location"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        placeholder="e.g. Bangalore"
                    />
                </div>
             </div>

             {/* Section 2: Order Requirements */}
             <div className="space-y-4">
                 <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-1">
                     <ShoppingBag size={14} /> Requirement
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Lead Category"
                        value={formData.category}
                        onChange={(e) => handleChange('category', e.target.value)}
                        options={appOptions.categories}
                    />
                     <Select
                        label="Assign Owner"
                        value={formData.ydsPoc}
                        onChange={(e) => handleChange('ydsPoc', e.target.value)}
                        options={appOptions.owners}
                        placeholder="Select..."
                    />
                </div>

                 <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Product Type"
                        value={formData.productType}
                        onChange={(e) => handleChange('productType', e.target.value)}
                        options={appOptions.productTypes}
                        placeholder="Select Product"
                    />
                    <Select
                        label="Print Technique"
                        value={formData.printType}
                        onChange={(e) => handleChange('printType', e.target.value)}
                        options={appOptions.printTypes}
                        placeholder="Select Tech"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Est. Quantity"
                        type="number"
                        value={formData.estimatedQty}
                        onChange={(e) => handleChange('estimatedQty', parseInt(e.target.value) || 0)}
                    />
                    <Input
                        label="Employee (Created By)"
                        value={formData.employeeName}
                        onChange={(e) => handleChange('employeeName', e.target.value)}
                    />
                 </div>

                <Textarea
                    label="Order Notes / Description"
                    value={formData.orderInfo}
                    onChange={(e) => handleChange('orderInfo', e.target.value)}
                    placeholder="Specific requirements, colours, deadlines..."
                />
             </div>
        </div>
    </Modal>
  );
};