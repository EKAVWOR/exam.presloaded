import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdMenuBook, MdPerson, MdSchool, MdLogin,
  MdAdminPanelSettings, MdKeyboardArrowDown,
  MdErrorOutline, MdEmail, MdLock, MdVisibility,
  MdVisibilityOff,
} from "react-icons/md";
import { db, auth } from "../firebase";
import {
  collection, addDoc, doc, getDoc,
  getDocs, serverTimestamp,
} from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";

const Home = () => {
  const [role, setRole] = useState("");
  const [course, setCourse] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [courses, setCourses] = useState([]);

  const navigate = useNavigate();

  // Load courses
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const snap = await getDocs(collection(db, "courses"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCourses(data);
      } catch (err) {
        console.error("Failed to load courses:", err);
      }
    };
    loadCourses();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!role) newErrors.role = "Please select a role.";

    if (role === "admin") {
      if (!email.trim()) newErrors.email = "Email is required.";
      if (!password.trim()) newErrors.password = "Password is required.";
    } else {
      if (!fullName.trim()) newErrors.fullName = "Full name is required.";
      if (role === "student" && !course)
        newErrors.course = "Please select a course.";
    }
    return newErrors;
  };

  const handleLogin = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      // ── ADMIN FLOW (Firebase Auth) ──
      if (role === "admin") {
        const userCred = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        // Verify this user is an admin in Firestore
        const adminDoc = await getDoc(doc(db, "admins", "main"));

        if (
          adminDoc.exists() &&
          adminDoc.data().uid === userCred.user.uid
        ) {
          sessionStorage.setItem("isAdmin", "true");
          sessionStorage.setItem("adminUid", userCred.user.uid);
          navigate("/admin", {
            state: { adminName: adminDoc.data().name || "Admin" },
          });
        } else {
          await auth.signOut();
          setErrors({ email: "Access denied. Not an admin account." });
          setIsLoading(false);
        }
        return;
      }

      // ── STUDENT FLOW (No auth — just register) ──
      const docRef = await addDoc(collection(db, "students"), {
        name: fullName.trim(),
        course,
        courseName: courses.find((c) => c.id === course)?.name || course,
        joinedAt: serverTimestamp(),
        submitted: false,
        score: null,
        percentage: null,
      });

      const student = {
        id: docRef.id,
        name: fullName.trim(),
        course,
        courseName: courses.find((c) => c.id === course)?.name || course,
      };

      sessionStorage.setItem("currentStudent", JSON.stringify(student));
      navigate("/student", { state: student });
    } catch (error) {
      console.error("Login error:", error);

      // Friendlier Firebase Auth errors
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        setErrors({ password: "Invalid email or password." });
      } else if (error.code === "auth/user-not-found") {
        setErrors({ email: "No admin account found with this email." });
      } else if (error.code === "auth/too-many-requests") {
        setErrors({ password: "Too many attempts. Try again later." });
      } else if (error.code === "auth/invalid-email") {
        setErrors({ email: "Invalid email format." });
      } else {
        setErrors({ fullName: "Something went wrong. Try again." });
      }
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 mb-5 shadow-2xl">
            <MdMenuBook className="text-white" style={{ fontSize: "2.5rem" }} />
          </div>
          <h1 className="text-3xl font-bold text-white leading-tight mb-2">
            PresLoaded E-Exam
          </h1>
          <p className="text-green-200/80 text-sm font-medium tracking-widest uppercase">
            Online Examination Platform
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-600" />
          <div className="p-8">
            <div className="mb-7">
              <h2 className="text-xl font-bold text-gray-800">Sign In</h2>
              <p className="text-gray-500 text-sm mt-1">
                {role === "admin"
                  ? "Enter your admin credentials."
                  : "Fill in your details to access the platform."}
              </p>
            </div>

            <div className="space-y-5">
              {/* Role Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Select Role
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    {role === "admin" ? (
                      <MdAdminPanelSettings className="text-green-600" style={{ fontSize: "1.2rem" }} />
                    ) : (
                      <MdPerson className="text-gray-400" style={{ fontSize: "1.2rem" }} />
                    )}
                  </div>
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setErrors({});
                      // Clear opposite fields
                      if (e.target.value === "admin") {
                        setFullName("");
                        setCourse("");
                      } else {
                        setEmail("");
                        setPassword("");
                      }
                    }}
                    className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl text-sm font-medium bg-white appearance-none outline-none transition-all cursor-pointer
                      ${errors.role ? "border-red-400" : "border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 hover:border-gray-300"}
                      ${role ? "text-gray-800" : "text-gray-400"}`}
                  >
                    <option value="" disabled hidden>Student or Admin?</option>
                    <option value="student">🎓 Student</option>
                    <option value="admin">🛡️ Administrator</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    <MdKeyboardArrowDown className="text-gray-400" style={{ fontSize: "1.25rem" }} />
                  </div>
                </div>
                {errors.role && (
                  <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                    <MdErrorOutline style={{ fontSize: "0.85rem" }} />
                    {errors.role}
                  </p>
                )}
              </div>

              {/* ── ADMIN FIELDS ── */}
              {role === "admin" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <MdEmail className="text-gray-400" style={{ fontSize: "1.2rem" }} />
                      </div>
                      <input
                        type="email"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErrors((prev) => ({ ...prev, email: "" }));
                        }}
                        onKeyDown={handleKeyDown}
                        className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm font-medium outline-none transition-all
                          ${errors.email ? "border-red-400" : "border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 hover:border-gray-300"}`}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                        <MdErrorOutline style={{ fontSize: "0.85rem" }} />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <MdLock className="text-gray-400" style={{ fontSize: "1.2rem" }} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setErrors((prev) => ({ ...prev, password: "" }));
                        }}
                        onKeyDown={handleKeyDown}
                        className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl text-sm font-medium outline-none transition-all
                          ${errors.password ? "border-red-400" : "border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 hover:border-gray-300"}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <MdVisibilityOff style={{ fontSize: "1.25rem" }} />
                        ) : (
                          <MdVisibility style={{ fontSize: "1.25rem" }} />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                        <MdErrorOutline style={{ fontSize: "0.85rem" }} />
                        {errors.password}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* ── STUDENT FIELDS ── */}
              {role === "student" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <MdPerson className="text-gray-400" style={{ fontSize: "1.2rem" }} />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          setErrors((prev) => ({ ...prev, fullName: "" }));
                        }}
                        onKeyDown={handleKeyDown}
                        className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm font-medium outline-none transition-all
                          ${errors.fullName ? "border-red-400" : "border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 hover:border-gray-300"}`}
                      />
                    </div>
                    {errors.fullName && (
                      <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                        <MdErrorOutline style={{ fontSize: "0.85rem" }} />
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Course Title</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <MdSchool className="text-gray-400" style={{ fontSize: "1.2rem" }} />
                      </div>
                      <select
                        value={course}
                        onChange={(e) => {
                          setCourse(e.target.value);
                          setErrors((prev) => ({ ...prev, course: "" }));
                        }}
                        className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl text-sm font-medium bg-white appearance-none outline-none transition-all cursor-pointer
                          ${errors.course ? "border-red-400" : "border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 hover:border-gray-300"}
                          ${course ? "text-gray-800" : "text-gray-400"}`}
                      >
                        <option value="" disabled hidden>Select your course</option>
                        {courses.length === 0 ? (
                          <option disabled>No courses available</option>
                        ) : (
                          courses.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))
                        )}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                        <MdKeyboardArrowDown className="text-gray-400" style={{ fontSize: "1.25rem" }} />
                      </div>
                    </div>
                    {errors.course && (
                      <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                        <MdErrorOutline style={{ fontSize: "0.85rem" }} />
                        {errors.course}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Submit */}
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoading || !role}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-green-400 disabled:to-emerald-400 text-white font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <MdLogin style={{ fontSize: "1.2rem" }} />
                    <span>Sign In to Platform</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              By signing in, you agree to the{" "}
              <span className="text-green-600 font-medium cursor-pointer hover:underline">
                Terms & Conditions
              </span>.
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-green-300/60 text-xs font-medium">
            © {new Date().getFullYear()} PresLoaded E-Exam
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;