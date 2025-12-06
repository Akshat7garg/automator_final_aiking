"use client";
import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { BiBook } from "react-icons/bi";
import { Pencil, Trash2 } from "lucide-react";
import { useProjectStore } from "@/app/store";

export default function ProjectInput() {
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const { projects, addProject, updateProject, deleteProject } = useProjectStore();
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    website: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.date || !formData.description) return;

    if (editId) {
      updateProject(editId, formData.name, formData.description, formData.date, formData.website);
    } else {
      addProject(
        formData.name,
        formData.description,
        formData.website,
        formData.date
      );
    }

    setFormData({ name: "", date: "", website: "", description: "" });
    setEditId(null);
    setIsOpen(false);
  };

  const handleEdit = (id: string) => {
    const project = projects.find((proj) => proj.id === id);
    if (project) {
      setFormData({
        name: project.name,
        date: project.date,
        website: project.website,
        description: project.description,
      });
      setEditId(id);
      setIsOpen(true);
    }
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
  };

  return (
    <section className="p-6 border-b border-[rgba(255,255,255,0.05)] bg-gradient-to-b from-main-bg via-[rgba(17,1,30,0.95)] to-main-bg text-text-subtitle shadow-2xl rounded-xl">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BiBook className="text-2xl text-white drop-shadow-glow" />
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent animate-pulse">
            Projects
          </h2>
        </div>
      </div>

      {/* Display Projects List */}
      {projects.length > 0 && (
        <div className="mb-6 space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-4 bg-gray-800/50 backdrop-blur-md rounded-xl flex justify-between items-center transition-all duration-300 hover:shadow-glow hover:scale-[1.02]"
            >
              <div>
                <strong className="text-lg font-semibold text-white drop-shadow-md">
                  {project.name}
                </strong>
                <p className="text-sm text-gray-300">{project.date}</p>
                {project.website && (
                  <a
                    href={project.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-xs underline hover:text-blue-300"
                  >
                    View Project
                  </a>
                )}
                <p className="text-xs text-gray-500">{project.description}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(project.id)}
                  className="p-2 rounded-full bg-blue-600/20 hover:bg-blue-600/40 transition-all duration-300"
                >
                  <Pencil className="w-5 h-5 text-blue-400" />
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="p-2 rounded-full bg-red-600/20 hover:bg-red-600/40 transition-all duration-300"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Project Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setEditId(null);
        }}
        className="w-full p-4 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 bg-[rgba(255,255,255,0.05)] backdrop-blur-md hover:border-gray-500 hover:text-white transition-all duration-300 shadow-inner hover:shadow-glow"
      >
        + {editId ? "Edit Project" : "Add a new project"}
      </button>

      {/* Project Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-6 z-50">
          <div className="bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] text-white p-8 rounded-2xl w-full max-w-[650px] shadow-2xl backdrop-blur-md border border-gray-700">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                {editId ? "Edit Project" : "Add Project"}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/70 transition-all duration-300"
              >
                <FaTimes size={20} className="text-gray-300" />
              </button>
            </div>

            {/* Project Form */}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-5 mb-6">
                <input
                  type="text"
                  name="name"
                  placeholder="Project Name"
                  className="w-full p-3 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <input
                  type="date"
                  name="date"
                  className="w-full p-3 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                  value={formData.date}
                  onChange={handleChange}
                  onFocus={(e) => e.target.showPicker()} // Show the date picker
                  required
                />
                <input
                  type="url"
                  name="website"
                  placeholder="Project Website (Optional)"
                  className="w-full p-3 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                  value={formData.website}
                  onChange={handleChange}
                />
              </div>

              {/* Description Textarea */}
              <div className="mb-6">
                <textarea
                  name="description"
                  className="w-full p-4 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg min-h-[160px] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                  placeholder="Describe your project..."
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#0eae95] text-white rounded-lg shadow-md hover:from-green-600 hover:to-green-800 hover:shadow-glow transition-all duration-300"
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