import React, { useState } from 'react';

export default function CustomerPOIntake() {
  const addressData = {
    India: {
      Karnataka: [
        { city: 'Bengaluru', pincode: '560001', address1: 'Manyata Tech Park', address2: 'Outer Ring Road' },
        { city: 'Mysuru', pincode: '570001', address1: 'Infosys Campus', address2: 'Hebbal' }
      ]
    },
    USA: {
      Texas: [
        { city: 'Dallas', pincode: '75001', address1: 'Tech Boulevard', address2: 'Suite 100' }
      ]
    }
  };

  const initialForm = {customerName:'',poNumber:'',customerEntity:'',entityCode:'',catalog:'',units:'',perUnitCost:'',billingMethod:'',country:'India',state:'Karnataka',city:'Bengaluru',address1:'Manyata Tech Park',address2:'Outer Ring Road',pincode:'560001'};
  const [form,setForm]=useState(initialForm);
  const [rows,setRows]=useState([]);
  const [selectedIndex,setSelectedIndex]=useState(null);

  const handle=(e)=>setForm({...form,[e.target.name]:e.target.value});

  const handlePdfUpload=(e)=>{
    const file=e.target.files?.[0];
    if(!file) return;

    // Demo auto-fill. Replace with PDF parser (pdfjs-dist) API response.
    const extracted={
      customerName:'TCS Global',
      poNumber:'PO-10001',
      customerEntity:'TCS-UK',
      entityCode:'ENT-0001',
      catalog:'Cat 1',
      units:'5',
      perUnitCost:'2000',
      billingMethod:'Monthly'
    };

    setForm(prev=>({...prev,...extracted}));

    setRows([
      {
        ...prev,
      },
      {
        customerEntity:'TCS-UK', entityCode:'ENT-0001', address1:'Manyata Tech Park', catalog:'Cat 1', units:5, perUnitCost:2000, totalCost:10000, billingMethod:'Monthly'
      },
      {
        customerEntity:'TCS-US', entityCode:'ENT-0002', address1:'Manyata Tech Park', catalog:'Cat 2', units:10, perUnitCost:1000, totalCost:10000, billingMethod:'Quarterly'
      }
    ].slice(1));
  };

  const totalCost=(+form.units||0)*(+form.perUnitCost||0);

  const addRow=()=>{ setRows([...rows,{...form,totalCost}]); setForm(initialForm);} ;
  const updateRow=()=>{ if(selectedIndex===null) return; const t=[...rows]; t[selectedIndex]={...form,totalCost}; setRows(t);} ;
  const removeRow=()=>{ if(selectedIndex===null) return; setRows(rows.filter((_,i)=>i!==selectedIndex)); setSelectedIndex(null);} ;

  const totalUnits=rows.reduce((a,b)=>a+(+b.units||0),0);
  const grandTotal=rows.reduce((a,b)=>a+(+b.totalCost||0),0);

  return (
  <div className='min-h-screen p-6 bg-slate-100'>
   <div className='p-6 mx-auto bg-white shadow max-w-7xl rounded-xl'>
   <h1 className='mb-6 text-3xl font-bold'>Customer PO Intake</h1>

   <div className='grid gap-4 mb-6 md:grid-cols-2'>
    <div>
      <label className='block mb-2 font-semibold'>Upload Customer PO PDF</label>
      <input type='file' accept='.pdf' onChange={handlePdfUpload}/>
      <p className='mt-1 text-xs text-green-600'>Demo: Upload auto-fills form and line items.</p>
    </div>
    <div>
      <label className='block mb-2 font-semibold'>Upload Additional Files</label>
      <input type='file' multiple accept='.xlsx,.xls,.msg,.doc,.docx,.pdf'/>
    </div>
   </div>

   <div className='grid gap-3 mb-4 md:grid-cols-2'>
    <input className='p-2 border rounded' name='customerName' placeholder='Customer Name' value={form.customerName} onChange={handle}/>
    <input className='p-2 border rounded' name='poNumber' placeholder='PO Number' value={form.poNumber} onChange={handle}/>
   </div>

   <h3 className='mb-3 font-bold'>Line Items</h3>
   <div className='grid gap-3 md:grid-cols-4'>
    <input className='p-2 border rounded' name='customerEntity' placeholder='Customer Entity' value={form.customerEntity} onChange={handle}/>
    <input className='p-2 border rounded' name='entityCode' placeholder='Entity Code' value={form.entityCode} onChange={handle}/>
    <input className='p-2 border rounded' name='catalog' placeholder='Catalog' value={form.catalog} onChange={handle}/>
    <input className='p-2 border rounded' name='units' placeholder='# Unit' value={form.units} onChange={handle}/>
    <input className='p-2 border rounded' name='perUnitCost' placeholder='Per Unit Cost' value={form.perUnitCost} onChange={handle}/>
    <input className='p-2 bg-gray-100 border rounded' value={totalCost} readOnly/>
    <select className='p-2 border rounded' name='billingMethod' value={form.billingMethod} onChange={handle}><option>Monthly</option><option>Quarterly</option><option>OneTime</option></select>
   </div>

   <h3 className='mt-6 mb-3 font-bold'>Shipment Address</h3>
   <div className='grid gap-3 md:grid-cols-3'>
      <select className='p-2 border rounded'><option>India</option><option>USA</option></select>
      <select className='p-2 border rounded'><option>Karnataka</option><option>Texas</option></select>
      <select className='p-2 border rounded'><option>Bengaluru</option><option>Mysuru</option><option>Dallas</option></select>
      <input className='p-2 bg-gray-100 border rounded' value={form.address1} readOnly />
      <input className='p-2 bg-gray-100 border rounded' value={form.address2} readOnly />
      <input className='p-2 bg-gray-100 border rounded' value={form.pincode} readOnly />
   </div>

   <div className='flex gap-2 mt-4'>
    <button className='px-3 py-1 text-sm text-white bg-green-600 rounded' onClick={addRow}>Add</button>
    <button className='px-3 py-1 text-sm text-white bg-blue-600 rounded' onClick={updateRow}>Update</button>
    <button className='px-3 py-1 text-sm text-white bg-red-600 rounded' onClick={removeRow}>Remove</button>
   </div>

   <table className='w-full mt-6 border'>
    <thead><tr><th>Entity</th><th>Code</th><th>Address</th><th>Catalog</th><th>Units</th><th>Per Unit</th><th>Total</th><th>Billing</th></tr></thead>
    <tbody>{rows.map((r,i)=><tr key={i} onClick={()=>{setForm(r);setSelectedIndex(i)}} className='cursor-pointer'><td>{r.customerEntity}</td><td>{r.entityCode}</td><td>{r.address1}</td><td>{r.catalog}</td><td>{r.units}</td><td>{r.perUnitCost}</td><td>{r.totalCost}</td><td>{r.billingMethod}</td></tr>)}</tbody>
   </table>

   <div className='mt-4 font-bold'>Total Units: {totalUnits} | Grand Total: {grandTotal}</div>
   </div></div>);
}
