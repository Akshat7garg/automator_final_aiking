"use client";
import { useCertificateStore } from "@/app/store";
import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { PiCertificateLight } from "react-icons/pi";
import { Pencil, Trash2 } from "lucide-react";

/* ----------- SHARED INPUT STYLES ----------- */
const inputClass =
  "w-full p-3 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] " +
  "border border-gray-700 rounded-lg text-white placeholder-gray-500 " +
  "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 " +
  "focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow";

export default function CertificationInput() {
  const { certificates, addCertificate, updateCertificate, deleteCertificate } =
    useCertificateStore();

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    awarder: "",
    date: "",
    link: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.awarder.trim() || !formData.date.trim())
      return;

    editId
      ? updateCertificate(
        editId,
        formData.title,
        formData.awarder,
        formData.date,
        formData.link
      )
      : addCertificate(
        formData.title,
        formData.awarder,
        formData.date,
        formData.link
      );

    setFormData({ title: "", awarder: "", date: "", link: "" });
    setEditId(null);
    setIsOpen(false);
  };

  const handleEdit = (id: string) => {
    const cert = certificates.find((c) => c.id === id);
    if (!cert) return;

    setFormData({
      title: cert.title,
      awarder: cert.awarder,
      date: cert.date,
      link: cert.link || "",
    });

    setEditId(id);
    setIsOpen(true);
  };

  return (
    <section className="p-6 border-b border-[rgba(255,255,255,0.05)] bg-gradient-to-b from-main-bg via-[rgba(17,1,30,0.95)] to-main-bg text-text-subtitle shadow-2xl rounded-xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <PiCertificateLight className="text-2xl text-white drop-shadow-glow" />
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent animate-pulse">
            Certifications
          </h2>
        </div>
      </div>

      {/* Certificate List */}
      {certificates.length > 0 && (
        <div className="mb-6 space-y-4">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="p-4 bg-gray-800/50 backdrop-blur-md rounded-xl flex justify-between items-center transition-all duration-300 hover:shadow-glow hover:scale-[1.02]"
            >
              <div>
                <strong className="text-lg font-semibold text-white drop-shadow-md">
                  {cert.title}
                </strong>
                <p className="text-sm text-gray-300">{cert.awarder}</p>
                <p className="text-sm text-gray-400">{cert.date}</p>

                {cert.link && (
                  <a
                    href={cert.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-xs underline hover:text-blue-300"
                  >
                    View Certificate
                  </a>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(cert.id)}
                  className="p-2 rounded-full bg-blue-600/20 hover:bg-blue-600/40 transition-all duration-300"
                >
                  <Pencil className="w-5 h-5 text-blue-400" />
                </button>

                <button
                  onClick={() => deleteCertificate(cert.id)}
                  className="p-2 rounded-full bg-red-600/20 hover:bg-red-600/40 transition-all duration-300"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Certification Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setEditId(null);
        }}
        className="w-full p-4 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 bg-[rgba(255,255,255,0.05)] backdrop-blur-md hover:border-gray-500 hover:text-white transition-all duration-300 shadow-inner hover:shadow-glow"
      >
        + Add a new certification
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-6 z-50">
          <div className="bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] text-white p-8 rounded-2xl w-full max-w-[650px] shadow-2xl backdrop-blur-md border border-gray-700">

            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                {editId ? "Update Certification" : "Add Certification"}
              </h2>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/70 transition-all duration-300"
              >
                <FaTimes size={20} className="text-gray-300" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-5 mb-6">
                <input
                  name="title"
                  placeholder="Certification Title"
                  className={inputClass}
                  value={formData.title}
                  onChange={handleChange}
                  required
                />

                <input
                  name="awarder"
                  placeholder="Awarded By"
                  className={inputClass}
                  value={formData.awarder}
                  onChange={handleChange}
                  required
                />

                <input
                  type="date"
                  name="date"
                  className={inputClass}
                  value={formData.date}
                  onChange={handleChange}
                  onFocus={(e) => e.target.showPicker()}
                  required
                />

                <input
                  type="url"
                  name="link"
                  placeholder="Certificate Link (Optional)"
                  className={inputClass}
                  value={formData.link}
                  onChange={handleChange}
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#0eae95] text-white rounded-lg shadow-md hover:shadow-glow transition-all duration-300"
                >
                  {editId ? "Update" : "Save"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </section>
  );
}
