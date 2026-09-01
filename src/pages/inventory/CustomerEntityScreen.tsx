import React, { useMemo, useState } from "react";

const locationData = {
  India: {
    currency: "INR",
    timezone: "Asia/Kolkata",
    states: {
      Karnataka: [
        {
          office: "Manyata Tech Park",
          address: "Manyata Tech Park, Bengaluru",
        },
        {
          office: "Electronic City",
          address: "Electronic City, Bengaluru",
        },
        {
          office: "Whitefield ITPL",
          address: "Whitefield, Bengaluru",
        },
      ],
      Telangana: [
        {
          office: "Hitech City",
          address: "Hitech City, Hyderabad",
        },
        {
          office: "Gachibowli",
          address: "Gachibowli, Hyderabad",
        },
      ],
      "Tamil Nadu": [
        {
          office: "MEPZ",
          address: "MEPZ, Chennai",
        },
        {
          office: "OMR",
          address: "OMR, Chennai",
        },
      ],
    },
  },

  USA: {
    currency: "USD",
    timezone: "America/New_York",
    states: {
      California: [
        {
          office: "San Francisco Office",
          address: "San Francisco, California",
        },
        {
          office: "Los Angeles Office",
          address: "Los Angeles, California",
        },
      ],
      Texas: [
        {
          office: "Dallas Office",
          address: "Dallas, Texas",
        },
        {
          office: "Austin Office",
          address: "Austin, Texas",
        },
      ],
      "New York": [
        {
          office: "New York City Office",
          address: "New York City",
        },
      ],
    },
  },
};

export default function CustomerEntityManagement() {
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [office, setOffice] = useState("");

  const [childEntities, setChildEntities] = useState([]);

  const parentEntity = {
    customerEntityName: "Cognizant Technologies Pvt Ltd",
    organizationName: "Cognizant Technologies",
  };

  const countries = Object.keys(locationData);

  const states = useMemo(() => {
    if (!country) return [];
    return Object.keys(locationData[country].states);
  }, [country]);

  const offices = useMemo(() => {
    if (!country || !state) return [];
    return locationData[country].states[state];
  }, [country, state]);

  const selectedOffice = useMemo(() => {
    return offices.find((item) => item.office === office);
  }, [office, offices]);

  const addChildEntity = () => {
    if (!country || !state || !office) {
      alert("Please select Country, State and Office");
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
      address: selectedOffice.address,
      currency: locationData[country].currency,
      timezone: locationData[country].timezone,
    };

    setChildEntities((prev) => [...prev, newRow]);

    setCountry("");
    setState("");
    setOffice("");
  };

  const deleteChildEntity = (id) => {
    setChildEntities((prev) =>
      prev.filter((item) => item.id !== id)
    );
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
          <h2 className="mb-4 text-xl font-bold text-slate-800">
            Parent Entity
          </h2>

          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="block mb-1 text-sm text-gray-500">
                Customer Entity Name
              </label>
              <input
                value={parentEntity.customerEntityName}
                readOnly
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm text-gray-500">
                Organization Name
              </label>
              <input
                value={parentEntity.organizationName}
                readOnly
                className="w-full p-2 border rounded"
              />
            </div>

          </div>
        </div>

        {/* Add Child Entity */}

        <div className="p-6 mb-6 bg-white shadow rounded-xl">
          <h2 className="mb-4 text-xl font-bold text-slate-800">
            Add Child Entity
          </h2>

          <div className="grid grid-cols-3 gap-4">

            <div>
              <label className="block mb-1 text-sm text-gray-500">
                Country
              </label>

              <select
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setState("");
                  setOffice("");
                }}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Country</option>

                {countries.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm text-gray-500">
                State
              </label>

              <select
                value={state}
                disabled={!country}
                onChange={(e) => {
                  setState(e.target.value);
                  setOffice("");
                }}
                className="w-full p-2 border rounded"
              >
                <option value="">Select State</option>

                {states.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm text-gray-500">
                Office
              </label>

              <select
                value={office}
                disabled={!state}
                onChange={(e) => setOffice(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Office</option>

                {offices.map((item) => (
                  <option
                    key={item.office}
                    value={item.office}
                  >
                    {item.office}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm text-gray-500">
                Currency
              </label>

              <input
                readOnly
                value={
                  country
                    ? locationData[country].currency
                    : ""
                }
                className="w-full p-2 border rounded bg-gray-50"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm text-gray-500">
                Time Zone
              </label>

              <input
                readOnly
                value={
                  country
                    ? locationData[country].timezone
                    : ""
                }
                className="w-full p-2 border rounded bg-gray-50"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm text-gray-500">
                Address
              </label>

              <input
                readOnly
                value={selectedOffice?.address || ""}
                className="w-full p-2 border rounded bg-gray-50"
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
            <h2 className="text-xl font-bold text-slate-800">
              Parent - Child Entity Mapping
            </h2>

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
                  <th className="p-3 border">
                    Parent Entity
                  </th>
                  <th className="p-3 border">
                    Country
                  </th>
                  <th className="p-3 border">
                    State
                  </th>
                  <th className="p-3 border">
                    Office
                  </th>
                  <th className="p-3 border">
                    Currency
                  </th>
                  <th className="p-3 border">
                    Timezone
                  </th>
                  <th className="p-3 border">
                    Address
                  </th>
                  <th className="p-3 border">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {childEntities.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-5 text-center text-gray-500"
                    >
                      No Child Entities Added
                    </td>
                  </tr>
                ) : (
                  childEntities.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="p-3 border">
                        {
                          parentEntity.customerEntityName
                        }
                      </td>

                      <td className="p-3 border">
                        {row.country}
                      </td>

                      <td className="p-3 border">
                        {row.state}
                      </td>

                      <td className="p-3 border">
                        {row.office}
                      </td>

                      <td className="p-3 border">
                        {row.currency}
                      </td>

                      <td className="p-3 border">
                        {row.timezone}
                      </td>

                      <td className="p-3 border">
                        {row.address}
                      </td>

                      <td className="p-3 text-center border">
                        <button
                          onClick={() =>
                            deleteChildEntity(row.id)
                          }
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