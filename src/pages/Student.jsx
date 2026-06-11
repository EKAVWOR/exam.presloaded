import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdLogout, MdCheckCircle, MdRadioButtonUnchecked,
  MdWarning, MdPerson, MdMenuBook, MdTimer,
  MdSend, MdEmojiEvents, MdClose, MdInfo,
} from "react-icons/md";
import { db } from "../firebase";
import {
  collection, onSnapshot, addDoc,
  doc, serverTimestamp, updateDoc,
  query, where,
} from "firebase/firestore";

/* ── Confirm Dialog ── */
const ConfirmDialog = ({ open, onConfirm, onCancel, answered, total }) => {
  if (!open) return null;
  const unanswered = total - answered;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ animation: "slideUp 0.25s ease-out" }}>
        <div className="h-1.5 w-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-600" />
        <div className="p-6">
          <div className="flex items-center justify-center w-14 h-14 bg-amber-100 rounded-2xl mx-auto mb-4">
            <MdWarning className="text-amber-500" style={{ fontSize: "2rem" }} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Submit Exam?</h3>
          <p className="text-sm text-slate-500 text-center mb-4">This action cannot be undone.</p>
          {unanswered > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
              <MdInfo className="text-amber-500 flex-shrink-0" style={{ fontSize: "1.1rem" }} />
              <p className="text-xs font-medium text-amber-700">
                You have <strong>{unanswered}</strong> unanswered {unanswered === 1 ? "question" : "questions"}.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-center mb-4 p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="text-xs text-slate-500 font-medium">Answered</p>
              <p className="text-lg font-bold text-green-600">{answered}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Skipped</p>
              <p className="text-lg font-bold text-red-500">{unanswered}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
              <MdClose style={{ fontSize: "1.1rem" }} /> Cancel
            </button>
            <button onClick={onConfirm} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-sm font-bold text-white shadow-md">
              <MdSend style={{ fontSize: "1.1rem" }} /> Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Success Screen ── */
const SuccessScreen = ({ student, onLogout }) => (
  <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex items-center justify-center p-4 relative overflow-hidden">
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
    </div>
    <div className="relative z-10 w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-600" />
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-2xl mb-5">
            <MdEmojiEvents className="text-green-600" style={{ fontSize: "3rem" }} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Exam Submitted!</h1>
          <p className="text-slate-500 text-sm mb-6">Your answers have been recorded successfully.</p>
          <div className="p-5 bg-green-50 rounded-2xl border border-green-100 mb-6">
            <MdCheckCircle className="text-green-500 mx-auto mb-3" style={{ fontSize: "2.5rem" }} />
            <p className="text-sm font-semibold text-green-800 mb-1">Thank you, {student?.name}!</p>
            <p className="text-xs text-green-700">
              Your exam for{" "}
              <span className="font-bold capitalize">
                {student?.courseName?.replace("-", " ") || student?.course?.replace("-", " ")}
              </span>{" "}
              has been submitted.
            </p>
            <p className="text-xs text-slate-500 mt-3">
              Your results will be reviewed by the administrator.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3 mb-6 text-left">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {student?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-800">{student?.name}</p>
              <p className="text-xs text-slate-500 capitalize">
                {student?.courseName?.replace("-", " ") || student?.course?.replace("-", " ")}
              </p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg">
            <MdLogout style={{ fontSize: "1.1rem" }} /> Back to Home
          </button>
        </div>
      </div>
    </div>
  </div>
);

/* ══════════════════════════
   MAIN STUDENT COMPONENT
══════════════════════════ */
const Student = () => {
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { [questionId]: "A" | "B" | "C" | "D" }
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [examActive, setExamActive] = useState(false);
  const [examStartedAt, setExamStartedAt] = useState(null);
  const [examDuration, setExamDuration] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load student from session
  useEffect(() => {
    const stored = JSON.parse(sessionStorage.getItem("currentStudent"));
    if (!stored) {
      navigate("/");
      return;
    }
    setStudent(stored);
  }, []);

  // Real-time questions filtered by course
  useEffect(() => {
    if (!student?.course) return;
    const q = query(
      collection(db, "questions"),
      where("courseId", "==", student.course)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setQuestions(data);

      // Set duration once based on question count
      if (data.length > 0 && examDuration === null) {
        const duration = Math.min(Math.max(data.length * 2 * 60, 5 * 60), 60 * 60);
        setExamDuration(duration);
      }
    });
    return () => unsub();
  }, [student, examDuration]);

  // Real-time exam status + auto-submit on stop
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "exam"), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const wasActive = examActive;

      setExamActive(data.active);
      setExamStartedAt(data.startedAt?.toDate?.() || null);

      // Admin stopped → auto-submit
      if (wasActive && !data.active && !submitted) {
        showToast("Admin has stopped the exam. Submitting your answers...", "info");
        setTimeout(() => handleConfirmSubmit(), 1500);
      }
    });
    return () => unsub();
  }, [examActive, submitted]);

  // Synchronized server-time countdown
  useEffect(() => {
    if (!examActive || !examStartedAt || !examDuration || submitted) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - examStartedAt.getTime()) / 1000);
      const remaining = examDuration - elapsed;

      if (remaining <= 0) {
        setTimeLeft(0);
        handleConfirmSubmit();
      } else {
        setTimeLeft(remaining);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [examActive, examStartedAt, examDuration, submitted]);

  const handleLogout = () => {
    sessionStorage.removeItem("currentStudent");
    navigate("/");
  };

  // ✅ Keyed by question ID
  const handleSelect = (qId, letter) => {
    if (!examActive) return;
    setAnswers((prev) => ({ ...prev, [qId]: letter }));
  };

  const handleConfirmSubmit = async () => {
    if (submitted) return; // Prevent double submission

    if (questions.length === 0) {
      showToast("No questions available for your course. Cannot submit.", "error");
      setShowConfirm(false);
      return;
    }

    let sc = 0;

    // ✅ Use question ID to look up selected letter
    questions.forEach((q) => {
      const selectedLetter = answers[q.id];
      const selectedIndex = ["A", "B", "C", "D"].indexOf(selectedLetter);
      const selectedText = selectedIndex >= 0 ? q.options[selectedIndex] : null;

      if (
        selectedText &&
        q.answer &&
        selectedText.trim().toLowerCase() === q.answer.trim().toLowerCase()
      ) {
        sc++;
      }
    });

    const percentage = Math.round((sc / questions.length) * 100);

    const result = {
      name: student?.name,
      course: student?.course,
      courseId: student?.course,
      courseName: student?.courseName,
      score: sc,
      total: questions.length,
      percentage,
      submittedAt: serverTimestamp(),
      // ✅ Use question ID to build answer record
      answers: questions.map((q) => {
        const selectedLetter = answers[q.id];
        const selectedIndex = ["A", "B", "C", "D"].indexOf(selectedLetter);
        const selectedText =
          selectedIndex >= 0 ? q.options[selectedIndex] : "Not Answered";

        return {
          question: q.question,
          selectedLetter: selectedLetter || "—",
          selected: selectedText,
          correct: q.answer,
        };
      }),
    };

    try {
      await addDoc(collection(db, "submissions"), result);
      if (student?.id) {
        await updateDoc(doc(db, "students", student.id), {
          submitted: true,
          score: sc,
          total: questions.length,
          percentage,
        });
      }
    } catch (err) {
      console.error("Submit error:", err);
    }

    setSubmitted(true);
    setShowConfirm(false);
  };

  const handleSubmitClick = () => {
    if (questions.length === 0) {
      showToast("No questions available for your course yet. Please wait.", "error");
      return;
    }
    if (!examActive) {
      showToast("Exam is not active. You cannot submit yet.", "error");
      return;
    }
    setShowConfirm(true);
  };

  // ✅ Count by question ID keys
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const timerColor =
    timeLeft !== null && timeLeft < 60 ? "text-red-400"
    : timeLeft !== null && timeLeft < 180 ? "text-amber-400"
    : "text-green-300";

  if (submitted) {
    return <SuccessScreen student={student} onLogout={handleLogout} />;
  }

  return (
    <>
      <div className="min-h-screen bg-slate-100 pb-32">
        {/* ── HEADER ── */}
        <header className="bg-gradient-to-r from-green-900 via-green-800 to-emerald-900 text-white shadow-xl sticky top-0 z-20">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 flex-shrink-0">
                <MdMenuBook style={{ fontSize: "1.35rem" }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-green-300 leading-none mb-0.5">
                  CBT Examination Portal
                </p>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-sm font-bold truncate">
                    <MdPerson style={{ fontSize: "1rem" }} className="text-green-300" />
                    {student?.name || "Student"}
                  </span>
                  <span className="hidden sm:flex items-center gap-1 text-xs text-green-300 capitalize">
                    · {student?.courseName?.replace("-", " ") || student?.course?.replace("-", " ")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {examActive && timeLeft !== null && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full border border-white/20 ${timerColor}`}>
                  <MdTimer style={{ fontSize: "1rem" }} />
                  <span className="text-sm font-bold tabular-nums">{formatTime(timeLeft)}</span>
                </div>
              )}
              {!examActive && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 rounded-full border border-amber-400/30 text-amber-200">
                  <MdTimer style={{ fontSize: "1rem" }} />
                  <span className="text-xs font-bold">Waiting...</span>
                </div>
              )}
              <button onClick={handleLogout} className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-full text-xs font-bold">
                <MdLogout style={{ fontSize: "1rem" }} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
          <div className="bg-white/10 h-1">
            <div
              className="h-1 bg-gradient-to-r from-green-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        {/* ── EXAM NOT ACTIVE BANNER ── */}
        {!examActive && (
          <div className="max-w-3xl mx-auto px-4 mt-4">
            <div className="flex items-center gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <MdWarning className="text-amber-500 flex-shrink-0" style={{ fontSize: "1.4rem" }} />
              <div>
                <p className="font-bold text-amber-700 text-sm">
                  {examStartedAt ? "Exam Stopped by Admin" : "Waiting for Exam to Start"}
                </p>
                <p className="text-xs text-amber-600">
                  {examStartedAt
                    ? "The administrator has stopped the exam."
                    : "Please wait for the administrator to start the exam."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── STATS BAR ── */}
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <MdCheckCircle className="text-green-600" style={{ fontSize: "1rem" }} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium leading-none">Answered</p>
                <p className="text-base font-bold text-slate-800">{answeredCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <MdRadioButtonUnchecked className="text-red-500" style={{ fontSize: "1rem" }} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium leading-none">Remaining</p>
                <p className="text-base font-bold text-slate-800">{questions.length - answeredCount}</p>
              </div>
            </div>
            <div className="flex-1 min-w-[100px]">
              <div className="flex justify-between text-xs text-slate-500 font-medium mb-1">
                <span>Progress</span><span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── QUESTIONS ── */}
        <div className="max-w-3xl mx-auto px-4 mt-5 space-y-5">
          {questions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-2xl mb-3">
                <MdWarning className="text-amber-500" style={{ fontSize: "1.8rem" }} />
              </div>
              <p className="font-semibold text-slate-700">No Questions Available</p>
              <p className="text-sm text-slate-500 mt-1">
                Your course doesn't have questions yet. Please wait or contact the administrator.
              </p>
            </div>
          ) : (
            questions.map((q, i) => {
              // ✅ Check by question ID
              const isAnswered = answers[q.id] !== undefined;
              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-2xl shadow-sm border-l-4 border transition-all ${
                    isAnswered ? "border-l-green-500 border-slate-200" : "border-l-slate-300 border-slate-200"
                  }`}
                >
                  <div className="p-5 pb-3 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${isAnswered ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {isAnswered ? <MdCheckCircle style={{ fontSize: "1.1rem" }} /> : i + 1}
                    </div>
                    <h2 className="font-semibold text-slate-800 text-sm leading-relaxed">
                      {i + 1}. {q.question}
                    </h2>
                  </div>
                  <div className="px-5 pb-5 space-y-2">
                    {q.options.map((opt, index) => {
                      const letter = ["A", "B", "C", "D"][index];
                      // ✅ Check selected by question ID
                      const isSelected = answers[q.id] === letter;
                      return (
                        <label
                          key={index}
                          className={`flex items-center gap-3 p-3.5 border-2 rounded-xl transition-all select-none ${
                            !examActive
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer"
                          } ${
                            isSelected
                              ? "bg-green-50 border-green-500 shadow-sm"
                              : examActive
                              ? "border-slate-200 hover:border-green-300 hover:bg-slate-50"
                              : "border-slate-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${q.id}`}
                            checked={isSelected}
                            // ✅ Pass question ID
                            onChange={() => handleSelect(q.id, letter)}
                            disabled={!examActive}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-green-500 bg-green-500" : "border-slate-300"}`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                            {letter}
                          </span>
                          <span className={`text-sm font-medium ${isSelected ? "text-green-800" : "text-slate-700"}`}>
                            {opt}
                          </span>
                          {isSelected && (
                            <MdCheckCircle className="text-green-500 ml-auto flex-shrink-0" style={{ fontSize: "1.1rem" }} />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── SUBMIT BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800">{answeredCount}</span> of{" "}
            <span className="font-bold text-slate-800">{questions.length}</span> answered
          </p>
          <button
            onClick={handleSubmitClick}
            disabled={questions.length === 0 || !examActive}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white text-sm shadow-md ${
              questions.length === 0 || !examActive
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:shadow-lg hover:-translate-y-0.5"
            }`}
          >
            <MdSend style={{ fontSize: "1.1rem" }} /> Submit Exam
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirm(false)}
        answered={answeredCount}
        total={questions.length}
      />

      {/* ── TOAST ── */}
      {toast && (
        <div
          className={`fixed bottom-24 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border ${
            toast.type === "info"
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
          style={{ animation: "slideUp 0.3s ease-out" }}
        >
          {toast.type === "info"
            ? <MdInfo style={{ fontSize: "1.2rem" }} />
            : <MdWarning style={{ fontSize: "1.2rem" }} />}
          <p className="font-semibold text-sm">{toast.message}</p>
        </div>
      )}

      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  );
};

export default Student;