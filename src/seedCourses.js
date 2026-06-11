import { db } from "./firebase";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";

const coursesToAdd = [
  "Graphic Design",
  "Web Development",
  "UI/UX Design",
  "Digital Marketing",
  "Data Science",
  "Cyber Security",
  "Mobile App Development",
  "Cloud Computing",
  "Artificial Intelligence",
  "Software Engineering",
  "Video Editing",
  "3D Animation",
  "Game Development",
  "Blockchain Development",
  "Database Management",
];

export const seedCourses = async () => {
  try {
    // Check if courses already exist
    const existing = await getDocs(collection(db, "courses"));
    if (existing.docs.length > 0) {
      console.log("Courses already exist. Skipping seed.");
      return;
    }

    // Add each course
    for (const name of coursesToAdd) {
      await addDoc(collection(db, "courses"), {
        name,
        createdAt: serverTimestamp(),
      });
      console.log(`✅ Added: ${name}`);
    }

    console.log("🎉 All courses seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding courses:", error);
  }
};