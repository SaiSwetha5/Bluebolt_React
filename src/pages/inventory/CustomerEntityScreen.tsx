import React, { useMemo, useState } from "react";

const locationData = {
  India: {
    currency: "INR",
    timezone: "Asia/Kolkata",
    states: {
      Karnataka: [
        { office: "Manyata Tech Park", address: "Manyata Tech Park, Bengaluru", pincode: "560045" },
        { office: "Electronic City", address: "Electronic City, Bengaluru", pincode: "560100" },
        { office: "Whitefield ITPL", address: "Whitefield, Bengaluru", pincode: "560066" },
      ],
      Telangana: [
        { office: "Hitech City", address: "Hitech City, Hyderabad", pincode: "500081" },
        { office: "Gachibowli", address: "Gachibowli, Hyderabad", pincode: "500032" },
      ],
      "Tamil Nadu": [
        { office: "MEPZ", address: "MEPZ, Chennai", pincode: "600045" },
        { office: "OMR", address: "OMR, Chennai", pincode: "600096" },
      ],
    },
  },

  USA: {
    currency: "USD",
    timezone: "America/New_York",
    states: {
      California: [
        { office: "San Francisco Office", address: "San Francisco, California", pincode: "94105" },
        { office: "Los Angeles Office", address: "Los Angeles, California", pincode: "90001" },
      ],
      Texas: [
        { office: "Dallas Office", address: "Dallas, Texas", pincode: "75201" },
        { office: "Austin Office", address: "Austin, Texas", pincode: "73301" },
      ],
      "New York": [
        { office: "New York City Office", address: "New York City", pincode: "10001" },
      ],
    },
  },
};

/**
 * Reusable searchable input.
 * - Lets the user pick from a list of suggestions (typeahead via <datalist>)
 * - Also lets the user type a completely new/manual value that isn't in the list
 * - Fires onChange with whatever the user typed or picked
 */
function SearchableInput({ id, label, value, onChange, options, disabled, placeholder }) {
  return (
    <div>
      <label className="block mb-1 text-sm text-gray-500">{label}</label>
      <input
        list={`${id}-options`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `Search or type ${label}`}
        className="w-full p-2 border rounded disabled:bg-gray-100"
        autoComplete="off"
      />
      <datalist id={`${id}-options`}>
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
    </div>
  );
}

export default function CustomerEntityManagement() {
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [office, setOffice] = useState("");
  const [currency, setCurrency] = useState("");
  const [timezone, setTimezone] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [pincode, setPincode] = useState("");

  const [childEntities, setChildEntities] = useState([]);

  const parentEntity = {
    customerEntityName: "Cognizant Technologies Pvt Ltd",
    organizationName: "Cognizant Technologies",
  };

  const countryOptions = Object.keys(locationData);

  const stateOptions = useMemo(() => {
    if (!country || !locationData[country]) return [];
    return Object.keys(locationData[country].states);
  }, [country]);

  const officeList = useMemo(() => {
    if (!country || !state) return [];
    if (!locationData[country] || !locationData[country].states[state]) return [];
    return locationData[country].states[state];
  }, [country, state]);

  const officeOptions = useMemo(() => officeList.map((o) => o.office), [officeList]);

  const matchedOffice = useMemo(
    () => officeList.find((item) => item.office === office),
    [office, officeList]
  );

  // Whenever country changes, auto-fill currency/timezone if it's a known country.
  // If the user typed a brand-new country manually, leave currency/timezone editable & blank.
  const handleCountryChange = (val) => {
    setCountry(val);
    setState("");
    setOffice("");
    setAddress1("");
    setAddress2("");
    setPincode("");
    if (locationData[val]) {
      setCurrency(locationData[val].currency);
      setTimezone(locationData[val].timezone);
    } else {
      setCurrency("");
      setTimezone("");
    }
  };

  const handleStateChange = (val) => {
    setState(val);
    setOffice("");
    setAddress1("");
    setAddress2("");
    setPincode("");
  };

  // Whenever office changes and it matches a known office, auto-fill address/pincode.
  // If manually typed, leave address/pincode editable for manual entry.
  const handleOfficeChange = (val) => {
    setOffice(val);
    const found = officeList.find((item) => item.office === val);
    if (found) {
      setAddress1(found.address);
      setAddress2("");
      setPincode(found.pincode);
    } else {
      setAddress1("");
      setAddress2("");
      setPincode("");
    }
  };

  const resetForm = () => {
    setCountry("");
    setState("");
    setOffice("");
    setCurrency("");
    setTimezone("");
    setAddress1("");
    setAddress2("");
    setPincode("");
  };

  const addChildEntity = () => {
    if (!country || !state || !office) {
      alert("Please select/enter Country, State and Office");
      return;
    }

    const alreadyExists = childEntities.some(
      (row) =>
        row.country === country &&
        row.state === state &&
        row.office === office
    );

    if (alreadyExists) {
      alert("This location is already added.");
      return;
    }

    const newRow = {
      id: Date.now(),
      country,
      state,
      office,
      currency,
      timezone,
      address1,
      address2,
      pincode,
    };

    setChildEntities((prev) => [...prev, newRow]);
    resetForm();
  };

  const deleteChildEntity = (id) => {
    setChildEntities((prev) => prev.filter((item) => item.id !== id));
  };

  const saveAll = () => {
    const payload = {
      parentEntity,
      childEntities,
    };

    console.log("Final Payload:");
    console.log(payload);

    alert("Payload generated. Check browser console.");
  };

  return (
    <div className="min-h-screen p-8 bg-slate-100">
      <div className="mx-auto max-w-7xl">
        {/* Parent Entity */}
        <div className="p-6 mb-6 bg-white shadow rounded-xl">
          <h2 className="mb-4 text-xl font-bold text-slate-800">Parent Entity</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-sm text-gray-500">Customer Entity Name</label>
              <input value={parentEntity.customerEntityName} readOnly className="w-full p-2 border rounded" />
            </div>

            <div>
              <label className="block mb-1 text-sm text-gray-500">Organization Name</label>
              <input value={parentEntity.organizationName} readOnly className="w-full p-2 border rounded" />
            </div>
          </div>
        </div>

        {/* Add Child Entity */}
        <div className="p-6 mb-6 bg-white shadow rounded-xl">
          <h2 className="mb-4 text-xl font-bold text-slate-800">Add Child Entity</h2>
          <p className="mb-4 text-xs text-gray-400">
            Search &amp; select from the list, or simply type a new value manually in any field.
          </p>

          <div className="grid grid-cols-3 gap-4">
            <SearchableInput
              id="country"
              label="Country"
              value={country}
              onChange={handleCountryChange}
              options={countryOptions}
            />

            <SearchableInput
              id="state"
              label="State"
              value={state}
              onChange={handleStateChange}
              options={stateOptions}
              disabled={!country}
            />

            <SearchableInput
              id="office"
              label="Office"
              value={office}
              onChange={handleOfficeChange}
              options={officeOptions}
              disabled={!country || !state}
            />

            <div>
              <label className="block mb-1 text-sm text-gray-500">Currency</label>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="Enter Currency"
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm text-gray-500">Time Zone</label>
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Enter Time Zone"
                className="w-full p-2 border rounded"
              />
            </div>

     

            <div>
              <label className="block mb-1 text-sm text-gray-500">Address 1</label>
              <input
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter Address 1"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm text-gray-500">Address 2</label>
              <input
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter Address 2"
              />
            </div>

                   <div>
              <label className="block mb-1 text-sm text-gray-500">Pincode</label>
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter Pincode"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="mt-5">
            <button
              onClick={addChildEntity}
              className="px-5 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Add Child Entity
            </button>
          </div>
        </div>

        {/* Mapping Table */}
        <div className="p-6 bg-white shadow rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Parent - Child Entity Mapping</h2>

            <button
              onClick={saveAll}
              className="px-5 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              Save All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200">
              <thead>
                <tr className="text-white bg-slate-800">
                  <th className="p-3 border">Parent Entity</th>
                  <th className="p-3 border">Country</th>
                  <th className="p-3 border">State</th>
                  <th className="p-3 border">Office</th>
                  <th className="p-3 border">Currency</th>
                  <th className="p-3 border">Timezone</th>
                  <th className="p-3 border">Pincode</th>
                  <th className="p-3 border">Address 1</th>
                  <th className="p-3 border">Address 2</th>
                  <th className="p-3 border">Action</th>
                </tr>
              </thead>

              <tbody>
                {childEntities.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-5 text-center text-gray-500">
                      No Child Entities Added
                    </td>
                  </tr>
                ) : (
                  childEntities.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="p-3 border">{parentEntity.customerEntityName}</td>
                      <td className="p-3 border">{row.country}</td>
                      <td className="p-3 border">{row.state}</td>
                      <td className="p-3 border">{row.office}</td>
                      <td className="p-3 border">{row.currency}</td>
                      <td className="p-3 border">{row.timezone}</td>
                      <td className="p-3 border">{row.pincode}</td>
                      <td className="p-3 border">{row.address1}</td>
                      <td className="p-3 border">{row.address2}</td>
                      <td className="p-3 text-center border">
                        <button
                          onClick={() => deleteChildEntity(row.id)}
                          className="px-3 py-1 text-white bg-red-500 rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
