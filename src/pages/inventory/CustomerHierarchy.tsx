import React, { useState } from "react";
import {
  ChevronDown,
  Building2,
  MapPin,
  Filter,
  MoreVertical,
} from "lucide-react";

const CustomerHierarchy = () => {
  const [expanded, setExpanded] = useState(true);

  const organization = {
    name: "TechNova Solutions Pvt Ltd",
    description: "Global Technology Services and Solutions Provider",
    country: "India",
    currency: "INR",
    timezone: "(UTC+05:30) Asia/Kolkata",
    status: "Active",
    locations: [
      {
        name: "Bengaluru - Head Office",
        address:
          "Prestige Tech Park, Outer Ring Road, Marathahalli, Bengaluru, Karnataka 560037, India",
      },
      {
        name: "Bengaluru - Whitefield Office",
        address:
          "ITPL Main Road, Whitefield, Bengaluru, Karnataka 560066, India",
      },
      {
        name: "Bengaluru - Koramangala Office",
        address:
          "80 Feet Road, Koramangala 4th Block, Bengaluru, Karnataka 560034, India",
      },
    ],
  };

  const StatusBadge = ({ text }) => (
    <span className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
      {text}
    </span>
  );

  const TypeBadge = ({ text, color }) => (
    <span
      className={`px-3 py-1 text-xs rounded-full font-medium ${color}`}
    >
      {text}
    </span>
  );

  return (
    <div className="p-6 bg-white border rounded-xl border-slate-200">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">
        Customer Hierarchy
      </h2>

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <input
          placeholder="Search organization or location..."
          className="px-4 py-2 text-sm border rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button className="flex items-center justify-center w-10 h-10 border rounded-lg hover:bg-slate-50">
          <Filter size={18} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden border border-slate-200 rounded-xl">
        <table className="w-full">
          <thead className="text-xs uppercase bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4 text-left">
                Organization / Location
              </th>
              <th className="text-left">Entity Type</th>
              <th className="text-left">Country</th>
              <th className="text-left">Currency</th>
              <th className="text-left">Time Zone</th>
              <th className="text-left">Status</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {/* Parent */}
            <tr className="border-t">
              <td className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-1"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition ${
                        expanded ? "" : "-rotate-90"
                      }`}
                    />
                  </button>

                  <Building2
                    size={18}
                    className="mt-1 text-indigo-600"
                  />

                  <div>
                    <div className="font-semibold text-slate-800">
                      {organization.name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {organization.description}
                    </div>
                  </div>
                </div>
              </td>

              <td>
                <TypeBadge
                  text="Organization"
                  color="bg-purple-100 text-purple-700"
                />
              </td>

              <td>🇮🇳 India</td>

              <td>INR</td>

              <td>{organization.timezone}</td>

              <td>
                <StatusBadge text="Active" />
              </td>

           
            </tr>

            {/* Child Locations */}
            {expanded &&
              organization.locations.map((location, index) => (
                <tr
                  key={index}
                  className="border-t hover:bg-slate-50"
                >
                  <td className="px-5 py-4 pl-14">
                    <div className="flex gap-3">
                      <MapPin
                        size={16}
                        className="mt-1 text-slate-500"
                      />
                      <div>
                        <div className="font-medium text-slate-700">
                          {location.name}
                        </div>

                        <div className="text-sm text-slate-500">
                          {location.address}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <TypeBadge
                      text="Location"
                      color="bg-sky-100 text-sky-700"
                    />
                  </td>

                  <td>🇮🇳 India</td>

                  <td>INR</td>

                  <td>(UTC+05:30) Asia/Kolkata</td>

                  <td>
                    <StatusBadge text="Active" />
                  </td>
 
                </tr>
              ))}
          </tbody>
        </table>
      </div>
 
    </div>
  );
};

export default CustomerHierarchy;