import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MdDashboard, MdPeople, MdQuiz, MdPlayCircle,
  MdStopCircle, MdAssignment, MdLogout, MdSchool,
  MdClose, MdAdd, MdCheckCircle, MdCancel,
  MdTrendingUp, MdMenuBook, MdSearch, MdMenu,
  MdPerson, MdTimer, MdBarChart, MdArrowForward,
  MdWarning, MdDelete, MdEdit, MdSave,
  MdFilterList,
} from "react-icons/md";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import {
  collection, onSnapshot, addDoc, doc, setDoc,
  deleteDoc, updateDoc, serverTimestamp,
  query, orderBy,
} from "firebase/firestore";

const Admin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const adminName = location.state?.adminName || "Admin";

  const [students, setStudents] = useState([]);
  const [examActive, setExamActive] = useState(false);
  const [results, setResults] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);

  // Question form
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [answer, setAnswer] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [filterCourse, setFilterCourse] = useState("all");

  // Course form
  const [newCourseName, setNewCourseName] = useState("");
  const [editingCourse, setEditingCourse] = useState(null);
  const [editCourseName, setEditCourseName] = useState("");

  // Results filter
  const [resultFilterCourse, setResultFilterCourse] = useState("all");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem("isAdmin");
      sessionStorage.removeItem("adminUid");
      navigate("/");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Real-time Listeners ──
  useEffect(() => {
    const unsubs = [];

    unsubs.push(
      onSnapshot(
        query(collection(db, "students"), orderBy("joinedAt", "desc")),
        (snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      )
    );

    unsubs.push(
      onSnapshot(doc(db, "settings", "exam"), (snap) => {
        if (snap.exists()) setExamActive(snap.data().active);
      })
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, "submissions"), orderBy("submittedAt", "desc")),
        (snap) => setResults(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, "questions"), orderBy("createdAt", "desc")),
        (snap) => setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      )
    );

    unsubs.push(
      onSnapshot(collection(db, "courses"), (snap) =>
        setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      )
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  // ── Exam Toggle (with server timestamps) ──
  const toggleExam = async () => {
    const newStatus = !examActive;

    await setDoc(doc(db, "settings", "exam"), {
      active: newStatus,
      startedAt: newStatus ? serverTimestamp() : null,
      stoppedAt: newStatus ? null : serverTimestamp(),
    });

    showToast(
      newStatus
        ? "Exam started! Timer is now running for all students."
        : "Exam stopped. All students will auto-submit.",
      newStatus ? "success" : "info"
    );
  };

  // ── Add Question ──
  const addQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || options.some((o) => !o.trim()) || !answer.trim() || !selectedCourse) {
      showToast("Please fill all fields, select course, and pick correct answer.", "error");
      return;
    }

    // Verify answer matches one of the options
    if (!options.some((o) => o.trim() === answer.trim())) {
      showToast("Correct answer must be one of the options.", "error");
      return;
    }

    setIsAdding(true);
    try {
      const courseName = courses.find((c) => c.id === selectedCourse)?.name || "";
      await addDoc(collection(db, "questions"), {
        question: question.trim(),
        options: options.map((o) => o.trim()),
        answer: answer.trim(),
        courseId: selectedCourse,
        courseName,
        createdAt: serverTimestamp(),
      });
      setQuestion("");
      setOptions(["", "", "", ""]);
      setAnswer("");
      showToast("Question added!");
    } catch {
      showToast("Failed to add question.", "error");
    }
    setIsAdding(false);
  };

  const deleteQuestion = async (id) => {
    try {
      await deleteDoc(doc(db, "questions", id));
      showToast("Question deleted.", "info");
      setDeleteId(null);
    } catch { showToast("Failed to delete.", "error"); }
  };

  // ── Course Management ──
  const addCourse = async () => {
    if (!newCourseName.trim()) {
      showToast("Course name is required.", "error");
      return;
    }
    try {
      await addDoc(collection(db, "courses"), {
        name: newCourseName.trim(),
        createdAt: serverTimestamp(),
      });
      setNewCourseName("");
      showToast("Course added!");
    } catch { showToast("Failed to add course.", "error"); }
  };

  const updateCourse = async (id) => {
    if (!editCourseName.trim()) return;
    try {
      await updateDoc(doc(db, "courses", id), { name: editCourseName.trim() });
      setEditingCourse(null);
      setEditCourseName("");
      showToast("Course updated!");
    } catch { showToast("Failed to update.", "error"); }
  };

  const deleteCourse = async (id) => {
    try {
      await deleteDoc(doc(db, "courses", id));
      showToast("Course deleted.", "info");
    } catch { showToast("Failed to delete.", "error"); }
  };

  const deleteStudent = async (id) => {
    try {
      await deleteDoc(doc(db, "students", id));
      showToast("Student removed.", "info");
    } catch { showToast("Failed to remove.", "error"); }
  };

  // ── Filters ──
  const filteredStudents = students.filter((s) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQuestions =
    filterCourse === "all"
      ? questions
      : questions.filter((q) => q.courseId === filterCourse);

  const filteredResults =
    resultFilterCourse === "all"
      ? results
      : results.filter((r) => r.courseId === resultFilterCourse);

  // ── Score helpers ──
  const validResults = results.filter((r) => r.total > 0);
  const averageScore =
    validResults.length > 0
      ? Math.round(validResults.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0) / validResults.length)
      : 0;

  const renderScoreBadge = (s) => {
    if (!s.submitted) return null;
    if (!s.total || s.total === 0) {
      return (
        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
          No Questions
        </span>
      );
    }
    return (
      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
        s.percentage >= 50 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}>
        {s.score}/{s.total} ({s.percentage}%)
      </span>
    );
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: MdDashboard },
    { id: "students", label: "Students", icon: MdPeople },
    { id: "courses", label: "Courses", icon: MdSchool },
    { id: "questions", label: "Questions", icon: MdQuiz },
    { id: "exam", label: "Exam Control", icon: MdPlayCircle },
    { id: "results", label: "Results", icon: MdAssignment },
  ];

  const handleNavClick = (id) => {
    setActiveNav(id);
    setActiveModal(id !== "dashboard" ? id : null);
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── SIDEBAR ── */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 text-white transform transition-transform duration-300 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <MdSchool style={{ fontSize: "1.4rem" }} />
            </div>
            <div>
              <h1 className="font-bold text-lg">PresLoaded</h1>
              <p className="text-green-300 text-xs">Admin Panel</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center font-bold text-sm">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{adminName}</p>
              <p className="text-xs text-green-300">Administrator</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1 flex-1">
          <p className="text-xs uppercase text-green-300/60 font-bold tracking-wider px-3 mb-2">Menu</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeNav === item.id ? "bg-white text-green-800 shadow-lg" : "text-green-100 hover:bg-white/10"}`}
              >
                <Icon style={{ fontSize: "1.2rem" }} />
                {item.label}
                {item.id === "courses" && (
                  <span className="ml-auto bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {courses.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-200 hover:bg-red-500/20">
            <MdLogout style={{ fontSize: "1.2rem" }} /> Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-30 lg:hidden" />}

      {/* ── MAIN ── */}
      <main className="flex-1 min-w-0">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="flex items-center justify-between px-4 md:px-6 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
                <MdMenu style={{ fontSize: "1.3rem" }} />
              </button>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-slate-800">Dashboard</h1>
                <p className="text-xs text-slate-500 hidden sm:block">Manage your exam platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                <div className={`w-2 h-2 rounded-full ${examActive ? "bg-green-500 animate-pulse" : "bg-slate-400"}`} />
                <span className="text-xs font-semibold text-slate-700">{examActive ? "Exam Live" : "Offline"}</span>
              </div>
              <button
                onClick={toggleExam}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md ${examActive ? "bg-gradient-to-r from-red-500 to-rose-600" : "bg-gradient-to-r from-green-600 to-emerald-600"}`}
              >
                {examActive ? <><MdStopCircle style={{ fontSize: "1.1rem" }} /><span className="hidden sm:inline">Stop</span></> : <><MdPlayCircle style={{ fontSize: "1.1rem" }} /><span className="hidden sm:inline">Start</span></>}
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard icon={MdPeople} label="Students" value={students.length} gradient="from-blue-500 to-cyan-500" />
            <StatCard icon={MdSchool} label="Courses" value={courses.length} gradient="from-purple-500 to-pink-500" />
            <StatCard icon={MdQuiz} label="Questions" value={questions.length} gradient="from-orange-500 to-red-500" />
            <StatCard icon={MdBarChart} label="Avg Score" value={`${averageScore}%`} gradient="from-green-500 to-emerald-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <MdPeople className="text-green-600" style={{ fontSize: "1.2rem" }} /> Students
                  </h2>
                  <p className="text-xs text-slate-500">{students.length} registered</p>
                </div>
                <div className="relative w-full sm:w-auto">
                  <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: "1rem" }} />
                  <input
                    type="text" placeholder="Search..."
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-44 pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <div className="p-4 max-h-[420px] overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <EmptyState icon={MdPeople} title="No students" message="Waiting for students to join." />
                ) : (
                  <div className="space-y-2">
                    {filteredStudents.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {s.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.courseName || s.course}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {renderScoreBadge(s)}
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${s.submitted ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                            {s.submitted ? "Done" : "Active"}
                          </span>
                          <button onClick={() => deleteStudent(s.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-lg">
                            <MdDelete className="text-red-500" style={{ fontSize: "1rem" }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <MdTrendingUp className="text-green-600" style={{ fontSize: "1.2rem" }} /> Quick Actions
                </h2>
              </div>
              <div className="p-4 space-y-2">
                <QuickAction icon={MdSchool} label="Manage Courses" description={`${courses.length} courses`} onClick={() => handleNavClick("courses")} color="bg-purple-50 text-purple-700" />
                <QuickAction icon={MdAdd} label="Add Question" description="Create MCQ questions" onClick={() => handleNavClick("questions")} color="bg-blue-50 text-blue-700" />
                <QuickAction icon={MdAssignment} label="View Results" description={`${results.length} submissions`} onClick={() => handleNavClick("results")} color="bg-green-50 text-green-700" />
                <QuickAction icon={MdPlayCircle} label="Exam Control" description="Start or stop exam" onClick={() => handleNavClick("exam")} color="bg-orange-50 text-orange-700" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ══════════ MODALS ══════════ */}

      {/* COURSES MODAL */}
      <Modal open={activeModal === "courses"} onClose={() => setActiveModal(null)} title="Manage Courses" icon={MdSchool}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text" placeholder="New course name..."
              value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCourse()}
              className="flex-1 px-3.5 py-2.5 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
            />
            <button onClick={addCourse} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl text-sm shadow-md hover:from-green-700 hover:to-emerald-700">
              <MdAdd style={{ fontSize: "1.1rem" }} /> Add
            </button>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {courses.length === 0 ? (
              <EmptyState icon={MdSchool} title="No courses" message="Add your first course above." />
            ) : (
              courses.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                  {editingCourse === c.id ? (
                    <>
                      <input
                        type="text" value={editCourseName}
                        onChange={(e) => setEditCourseName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && updateCourse(c.id)}
                        className="flex-1 px-3 py-2 border-2 border-green-400 rounded-lg text-sm outline-none focus:ring-4 focus:ring-green-100"
                        autoFocus
                      />
                      <button onClick={() => updateCourse(c.id)} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                        <MdSave style={{ fontSize: "1rem" }} />
                      </button>
                      <button onClick={() => setEditingCourse(null)} className="p-2 bg-slate-200 rounded-lg hover:bg-slate-300">
                        <MdClose style={{ fontSize: "1rem" }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MdSchool className="text-purple-600" style={{ fontSize: "1rem" }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800 text-sm">{c.name}</p>
                        <p className="text-xs text-slate-500">
                          {questions.filter((q) => q.courseId === c.id).length} questions
                        </p>
                      </div>
                      <button onClick={() => { setEditingCourse(c.id); setEditCourseName(c.name); }} className="p-1.5 hover:bg-blue-100 rounded-lg">
                        <MdEdit className="text-blue-500" style={{ fontSize: "1rem" }} />
                      </button>
                      <button onClick={() => deleteCourse(c.id)} className="p-1.5 hover:bg-red-100 rounded-lg">
                        <MdDelete className="text-red-400" style={{ fontSize: "1rem" }} />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* STUDENTS MODAL */}
      <Modal open={activeModal === "students"} onClose={() => setActiveModal(null)} title="All Students & Scores" icon={MdPeople} wide>
        {students.length === 0 ? (
          <EmptyState icon={MdPeople} title="No students" message="Waiting for students to join." />
        ) : (
          <div className="max-h-[65vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-600">Student</th>
                  <th className="text-left p-3 font-semibold text-slate-600">Course</th>
                  <th className="text-center p-3 font-semibold text-slate-600">Status</th>
                  <th className="text-center p-3 font-semibold text-slate-600">Score</th>
                  <th className="text-center p-3 font-semibold text-slate-600">%</th>
                  <th className="text-center p-3 font-semibold text-slate-600"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 group">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                          {s.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800">{s.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">{s.courseName || s.course}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${s.submitted ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                        {s.submitted ? "Submitted" : "Active"}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800">
                      {!s.submitted ? "—" :
                        s.total > 0 ? `${s.score}/${s.total}` :
                        <span className="text-xs text-amber-600">N/A</span>
                      }
                    </td>
                    <td className="p-3 text-center">
                      {!s.submitted ? "—" :
                        s.total > 0 ? (
                          <span className={`font-bold ${s.percentage >= 50 ? "text-green-600" : "text-red-600"}`}>
                            {s.percentage}%
                          </span>
                        ) : (
                          <span className="text-amber-600 font-bold text-xs">No Questions</span>
                        )
                      }
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => deleteStudent(s.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-lg">
                        <MdDelete className="text-red-400" style={{ fontSize: "1rem" }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* QUESTIONS MODAL */}
      <Modal open={activeModal === "questions"} onClose={() => setActiveModal(null)} title="Manage Questions" icon={MdQuiz} wide>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <p className="text-sm font-bold text-slate-700 mb-3">Add New Question</p>
            <form onSubmit={addQuestion} className="space-y-3">
              {/* Course */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course</label>
                <select
                  value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-green-500 appearance-none cursor-pointer bg-white"
                >
                  <option value="" disabled>Select course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Question */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Question</label>
                <textarea
                  placeholder="Enter question..." value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows="2"
                  className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-green-500 resize-none"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Options</label>
                {options.map((opt, i) => (
                  <div key={i} className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <input
                      type="text" placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      value={opt}
                      onChange={(e) => {
                        const u = [...options];
                        u[i] = e.target.value;
                        setOptions(u);
                        if (answer && !u.some((o) => o.trim() === answer.trim())) {
                          setAnswer("");
                        }
                      }}
                      className="w-full pl-11 pr-3.5 py-2.5 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-green-500"
                    />
                  </div>
                ))}
              </div>

              {/* Correct Answer Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correct Answer{" "}
                  <span className="text-slate-400 font-normal">(click an option below)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {options.map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const isSelected = answer === opt && opt.trim() !== "";
                    const isEmpty = !opt.trim();
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={isEmpty}
                        onClick={() => setAnswer(opt)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                          isEmpty
                            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                            : isSelected
                            ? "bg-green-500 border-green-600 text-white shadow-md"
                            : "bg-white border-slate-200 text-slate-700 hover:border-green-400 hover:bg-green-50"
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isSelected ? "bg-white text-green-600" : "bg-slate-100 text-slate-600"
                        }`}>
                          {letter}
                        </span>
                        <span className="truncate text-left">
                          {opt || `Option ${letter}`}
                        </span>
                        {isSelected && <MdCheckCircle className="ml-auto flex-shrink-0" style={{ fontSize: "1rem" }} />}
                      </button>
                    );
                  })}
                </div>
                {!answer && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <MdWarning style={{ fontSize: "0.9rem" }} /> Click one of the options above to mark as correct
                  </p>
                )}
              </div>

              <button type="submit" disabled={isAdding} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-md">
                {isAdding ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> : <MdAdd style={{ fontSize: "1.2rem" }} />}
                {isAdding ? "Saving..." : "Save Question"}
              </button>
            </form>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-700">Questions ({filteredQuestions.length})</p>
              <select
                value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none cursor-pointer"
              >
                <option value="all">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {filteredQuestions.length === 0 ? (
              <EmptyState icon={MdQuiz} title="No questions" message="Add your first question." />
            ) : (
              <div className="space-y-2">
                {filteredQuestions.map((q, i) => (
                  <div key={q.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full">
                          {q.courseName}
                        </span>
                        <p className="text-xs font-semibold text-slate-700 mt-1">{i + 1}. {q.question}</p>
                      </div>
                      <button onClick={() => setDeleteId(q.id)} className="p-1 hover:bg-red-100 rounded-lg flex-shrink-0">
                        <MdDelete className="text-red-400" style={{ fontSize: "1rem" }} />
                      </button>
                    </div>
                    <p className="text-xs text-green-700 font-medium mt-1">✓ {q.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {deleteId && (
          <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MdWarning className="text-red-500" style={{ fontSize: "1.3rem" }} />
              <p className="text-sm font-semibold text-red-700">Delete this question?</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="px-3 py-1.5 text-xs font-bold border-2 border-slate-200 rounded-lg hover:bg-slate-100">Cancel</button>
              <button onClick={() => deleteQuestion(deleteId)} className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600">Delete</button>
            </div>
          </div>
        )}
      </Modal>

      {/* EXAM MODAL */}
      <Modal open={activeModal === "exam"} onClose={() => setActiveModal(null)} title="Exam Control" icon={MdPlayCircle}>
        <div className={`p-6 rounded-2xl border-2 text-center ${examActive ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 ${examActive ? "bg-green-500" : "bg-slate-400"}`}>
            {examActive ? <MdPlayCircle className="text-white" style={{ fontSize: "2.2rem" }} /> : <MdStopCircle className="text-white" style={{ fontSize: "2.2rem" }} />}
          </div>
          <p className={`text-2xl font-bold ${examActive ? "text-green-700" : "text-slate-700"}`}>
            {examActive ? "Exam is LIVE" : "Exam is OFFLINE"}
          </p>
          <p className="text-sm text-slate-600 mt-2">
            {examActive
              ? "Timer is running. Students can answer and submit."
              : "Click Start to begin the exam timer for all students."}
          </p>
        </div>

        {/* Info Notice */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
          <MdInfoIcon />
          <div>
            <p className="text-xs font-bold text-blue-800">How it works</p>
            <p className="text-xs text-blue-700 mt-0.5">
              When you start the exam, the timer begins for all connected students.
              When you stop, all students automatically submit their current answers.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
            <p className="text-xs text-slate-500 font-medium">Students</p>
            <p className="text-2xl font-bold text-slate-800">{students.length}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
            <p className="text-xs text-slate-500 font-medium">Questions</p>
            <p className="text-2xl font-bold text-slate-800">{questions.length}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
            <p className="text-xs text-slate-500 font-medium">Courses</p>
            <p className="text-2xl font-bold text-slate-800">{courses.length}</p>
          </div>
        </div>

        <button
          onClick={toggleExam}
          className={`w-full mt-5 flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl shadow-md ${examActive ? "bg-gradient-to-r from-red-500 to-rose-600" : "bg-gradient-to-r from-green-600 to-emerald-600"}`}
        >
          {examActive ? <><MdStopCircle style={{ fontSize: "1.2rem" }} /> Stop Exam & Auto-Submit</> : <><MdPlayCircle style={{ fontSize: "1.2rem" }} /> Start Exam</>}
        </button>
      </Modal>

      {/* RESULTS MODAL */}
      <Modal open={activeModal === "results"} onClose={() => setActiveModal(null)} title="Results & Scores" icon={MdAssignment} wide>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-slate-700">{filteredResults.length} Submissions</p>
          <div className="flex items-center gap-2">
            <MdFilterList className="text-slate-400" style={{ fontSize: "1rem" }} />
            <select
              value={resultFilterCourse} onChange={(e) => setResultFilterCourse(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none cursor-pointer"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <EmptyState icon={MdAssignment} title="No submissions" message="Results appear once students submit." />
        ) : (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {filteredResults.map((r) => (
              <div key={r.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold">
                      {r.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.courseName || r.course}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {r.total > 0 ? (
                      <>
                        <p className="text-xl font-bold text-green-700">{r.score}/{r.total}</p>
                        <p className={`text-sm font-bold ${(r.percentage || 0) >= 50 ? "text-green-600" : "text-red-600"}`}>{r.percentage || 0}%</p>
                      </>
                    ) : (
                      <p className="text-sm font-bold text-amber-600">No Questions</p>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                    <MdMenuBook style={{ fontSize: "1rem" }} /> Answers
                  </p>
                  {Array.isArray(r.answers) && r.answers.length > 0 ? (
                    <div className="space-y-2">
                      {r.answers.map((a, idx) => {
                        const isCorrect =
                          a.selected &&
                          a.correct &&
                          a.selected.trim().toLowerCase() === a.correct.trim().toLowerCase();

                        return (
                          <div key={idx} className={`p-3 rounded-lg border ${isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                            <p className="text-xs font-semibold text-slate-800 mb-1">Q{idx + 1}: {a.question}</p>
                            <div className="flex flex-wrap gap-3 text-xs">
                              <span className={`flex items-center gap-1 font-medium ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                                {isCorrect ? <MdCheckCircle style={{ fontSize: "0.9rem" }} /> : <MdCancel style={{ fontSize: "0.9rem" }} />}
                                Selected:{" "}
                                <strong>
                                  {a.selectedLetter && a.selectedLetter !== "—"
                                    ? `${a.selectedLetter}. ${a.selected}`
                                    : a.selected}
                                </strong>
                              </span>
                              {!isCorrect && (
                                <span className="flex items-center gap-1 font-medium text-green-700">
                                  <MdCheckCircle style={{ fontSize: "0.9rem" }} /> Correct: <strong>{a.correct}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="text-sm text-red-500">No answers found.</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border ${toast.type === "error" ? "bg-red-50 border-red-200 text-red-700" : toast.type === "info" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-green-50 border-green-200 text-green-700"}`} style={{ animation: "slideUp 0.3s ease-out" }}>
          {toast.type === "error" ? <MdCancel style={{ fontSize: "1.2rem" }} /> : <MdCheckCircle style={{ fontSize: "1.2rem" }} />}
          <p className="font-semibold text-sm">{toast.message}</p>
        </div>
      )}

      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

const MdInfoIcon = () => (
  <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
  </svg>
);

const StatCard = ({ icon: Icon, label, value, gradient }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
      <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg`}>
        <Icon className="text-white" style={{ fontSize: "1.3rem" }} />
      </div>
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, label, description, onClick, color }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left group">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color} group-hover:scale-110 transition-transform`}>
      <Icon style={{ fontSize: "1.2rem" }} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm text-slate-800">{label}</p>
      <p className="text-xs text-slate-500 truncate">{description}</p>
    </div>
    <MdArrowForward className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: "1rem" }} />
  </button>
);

const EmptyState = ({ icon: Icon, title, message }) => (
  <div className="text-center py-10">
    <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-100 rounded-2xl mb-3">
      <Icon className="text-slate-400" style={{ fontSize: "1.8rem" }} />
    </div>
    <p className="font-semibold text-slate-700">{title}</p>
    <p className="text-sm text-slate-500 mt-1">{message}</p>
  </div>
);

const Modal = ({ open, onClose, title, icon: Icon, children, wide }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-4xl" : "max-w-md"} overflow-hidden`} onClick={(e) => e.stopPropagation()} style={{ animation: "slideUp 0.25s ease-out" }}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Icon className="text-green-600" style={{ fontSize: "1.3rem" }} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-white/80 flex items-center justify-center">
            <MdClose className="text-slate-600" style={{ fontSize: "1.2rem" }} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export default Admin;