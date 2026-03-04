import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

function grade(total: number): string {
    if (total >= 90) return "A+";
    if (total >= 80) return "A";
    if (total >= 70) return "B";
    if (total >= 60) return "C";
    if (total >= 50) return "D";
    return "F";
}

async function main() {
    console.log("🌱 Starting seed...");

    // ── 1. Admin ─────────────────────────────────────────────
    const existing = await prisma.admin.findUnique({ where: { username: "admin" } });
    if (!existing) {
        await prisma.admin.create({
            data: {
                username: "admin",
                password_hash: await bcrypt.hash("admin123", 10),
            },
        });
        console.log("✅ Admin created  (username: admin  |  password: admin123)");
    } else {
        console.log("ℹ️  Admin already exists");
    }

    // ── 2. Classes ────────────────────────────────────────────
    const classNames = ["10th Grade - Section A", "11th Grade - Science", "12th Grade - Commerce"];
    const classes: Record<string, string> = {};

    for (const name of classNames) {
        const cls = await prisma.class.upsert({
            where: { name },
            update: {},
            create: { name },
        });
        classes[name] = cls.id;
        console.log(`✅ Class: ${name}`);
    }

    // ── 3. Subjects ───────────────────────────────────────────
    const subjectMap: Record<string, string[]> = {
        "10th Grade - Section A": ["Mathematics", "Science", "English", "Social Studies", "Hindi"],
        "11th Grade - Science": ["Physics", "Chemistry", "Mathematics", "Biology", "English"],
        "12th Grade - Commerce": ["Accountancy", "Business Studies", "Economics", "Mathematics", "English"],
    };

    const subjects: Record<string, string> = {}; // "ClassName:SubjectName" → id

    for (const [className, subList] of Object.entries(subjectMap)) {
        const classId = classes[className];
        for (const subName of subList) {
            const existing = await prisma.subject.findFirst({
                where: { name: subName, class_id: classId },
            });
            const sub = existing ?? await prisma.subject.create({
                data: { name: subName, class_id: classId },
            });
            subjects[`${className}:${subName}`] = sub.id;
        }
        console.log(`✅ Subjects for ${className}`);
    }

    // ── 4. Students ───────────────────────────────────────────
    const studentsData = [
        // 10th Grade
        { first_name: "Aisha Rauf", usn: "10A001", dob: "2009-03-15", class: "10th Grade - Section A" },
        { first_name: "Mohammed Bilal", usn: "10A002", dob: "2009-07-22", class: "10th Grade - Section A" },
        { first_name: "Fatima Al-Sayed", usn: "10A003", dob: "2009-01-10", class: "10th Grade - Section A" },
        { first_name: "Omar Khalid", usn: "10A004", dob: "2009-11-05", class: "10th Grade - Section A" },
        { first_name: "Zainab Hassan", usn: "10A005", dob: "2009-06-30", class: "10th Grade - Section A" },
        // 11th Grade
        { first_name: "Ibrahim Yusuf", usn: "11S001", dob: "2008-02-14", class: "11th Grade - Science" },
        { first_name: "Maryam Rashid", usn: "11S002", dob: "2008-09-25", class: "11th Grade - Science" },
        { first_name: "Hamza Tariq", usn: "11S003", dob: "2008-04-18", class: "11th Grade - Science" },
        { first_name: "Nadia Saleh", usn: "11S004", dob: "2008-12-03", class: "11th Grade - Science" },
        // 12th Grade
        { first_name: "Khalid Mahmoud", usn: "12C001", dob: "2007-08-20", class: "12th Grade - Commerce" },
        { first_name: "Sana Perveen", usn: "12C002", dob: "2007-05-11", class: "12th Grade - Commerce" },
        { first_name: "Umar Farooq", usn: "12C003", dob: "2007-03-28", class: "12th Grade - Commerce" },
    ];

    const studentIds: Record<string, string> = {};

    for (const s of studentsData) {
        const existing = await prisma.student.findUnique({ where: { usn: s.usn } });
        if (!existing) {
            const dobHash = await bcrypt.hash(s.dob, 10);
            const student = await prisma.student.create({
                data: {
                    first_name: s.first_name,
                    usn: s.usn,
                    dob_hash: dobHash,
                    class_id: classes[s.class],
                },
            });
            studentIds[s.usn] = student.id;
        } else {
            studentIds[s.usn] = existing.id;
        }
    }
    console.log(`✅ ${studentsData.length} students created/verified`);

    // ── 5. Marks ──────────────────────────────────────────────
    const marksData: { usn: string; class: string; subject: string; total: number }[] = [
        // 10th Grade - Section A
        { usn: "10A001", class: "10th Grade - Section A", subject: "Mathematics", total: 92 },
        { usn: "10A001", class: "10th Grade - Section A", subject: "Science", total: 88 },
        { usn: "10A001", class: "10th Grade - Section A", subject: "English", total: 85 },
        { usn: "10A001", class: "10th Grade - Section A", subject: "Social Studies", total: 79 },
        { usn: "10A001", class: "10th Grade - Section A", subject: "Hindi", total: 91 },

        { usn: "10A002", class: "10th Grade - Section A", subject: "Mathematics", total: 74 },
        { usn: "10A002", class: "10th Grade - Section A", subject: "Science", total: 68 },
        { usn: "10A002", class: "10th Grade - Section A", subject: "English", total: 82 },
        { usn: "10A002", class: "10th Grade - Section A", subject: "Social Studies", total: 71 },
        { usn: "10A002", class: "10th Grade - Section A", subject: "Hindi", total: 65 },

        { usn: "10A003", class: "10th Grade - Section A", subject: "Mathematics", total: 96 },
        { usn: "10A003", class: "10th Grade - Section A", subject: "Science", total: 94 },
        { usn: "10A003", class: "10th Grade - Section A", subject: "English", total: 90 },
        { usn: "10A003", class: "10th Grade - Section A", subject: "Social Studies", total: 88 },
        { usn: "10A003", class: "10th Grade - Section A", subject: "Hindi", total: 87 },

        { usn: "10A004", class: "10th Grade - Section A", subject: "Mathematics", total: 55 },
        { usn: "10A004", class: "10th Grade - Section A", subject: "Science", total: 48 },
        { usn: "10A004", class: "10th Grade - Section A", subject: "English", total: 62 },
        { usn: "10A004", class: "10th Grade - Section A", subject: "Social Studies", total: 53 },
        { usn: "10A004", class: "10th Grade - Section A", subject: "Hindi", total: 59 },

        { usn: "10A005", class: "10th Grade - Section A", subject: "Mathematics", total: 81 },
        { usn: "10A005", class: "10th Grade - Section A", subject: "Science", total: 77 },
        { usn: "10A005", class: "10th Grade - Section A", subject: "English", total: 88 },
        { usn: "10A005", class: "10th Grade - Section A", subject: "Social Studies", total: 80 },
        { usn: "10A005", class: "10th Grade - Section A", subject: "Hindi", total: 84 },

        // 11th Grade - Science
        { usn: "11S001", class: "11th Grade - Science", subject: "Physics", total: 87 },
        { usn: "11S001", class: "11th Grade - Science", subject: "Chemistry", total: 83 },
        { usn: "11S001", class: "11th Grade - Science", subject: "Mathematics", total: 91 },
        { usn: "11S001", class: "11th Grade - Science", subject: "Biology", total: 79 },
        { usn: "11S001", class: "11th Grade - Science", subject: "English", total: 76 },

        { usn: "11S002", class: "11th Grade - Science", subject: "Physics", total: 93 },
        { usn: "11S002", class: "11th Grade - Science", subject: "Chemistry", total: 89 },
        { usn: "11S002", class: "11th Grade - Science", subject: "Mathematics", total: 95 },
        { usn: "11S002", class: "11th Grade - Science", subject: "Biology", total: 91 },
        { usn: "11S002", class: "11th Grade - Science", subject: "English", total: 88 },

        { usn: "11S003", class: "11th Grade - Science", subject: "Physics", total: 62 },
        { usn: "11S003", class: "11th Grade - Science", subject: "Chemistry", total: 58 },
        { usn: "11S003", class: "11th Grade - Science", subject: "Mathematics", total: 71 },
        { usn: "11S003", class: "11th Grade - Science", subject: "Biology", total: 65 },
        { usn: "11S003", class: "11th Grade - Science", subject: "English", total: 70 },

        { usn: "11S004", class: "11th Grade - Science", subject: "Physics", total: 78 },
        { usn: "11S004", class: "11th Grade - Science", subject: "Chemistry", total: 75 },
        { usn: "11S004", class: "11th Grade - Science", subject: "Mathematics", total: 82 },
        { usn: "11S004", class: "11th Grade - Science", subject: "Biology", total: 80 },
        { usn: "11S004", class: "11th Grade - Science", subject: "English", total: 77 },

        // 12th Grade - Commerce
        { usn: "12C001", class: "12th Grade - Commerce", subject: "Accountancy", total: 84 },
        { usn: "12C001", class: "12th Grade - Commerce", subject: "Business Studies", total: 79 },
        { usn: "12C001", class: "12th Grade - Commerce", subject: "Economics", total: 88 },
        { usn: "12C001", class: "12th Grade - Commerce", subject: "Mathematics", total: 76 },
        { usn: "12C001", class: "12th Grade - Commerce", subject: "English", total: 82 },

        { usn: "12C002", class: "12th Grade - Commerce", subject: "Accountancy", total: 91 },
        { usn: "12C002", class: "12th Grade - Commerce", subject: "Business Studies", total: 88 },
        { usn: "12C002", class: "12th Grade - Commerce", subject: "Economics", total: 93 },
        { usn: "12C002", class: "12th Grade - Commerce", subject: "Mathematics", total: 85 },
        { usn: "12C002", class: "12th Grade - Commerce", subject: "English", total: 90 },

        { usn: "12C003", class: "12th Grade - Commerce", subject: "Accountancy", total: 67 },
        { usn: "12C003", class: "12th Grade - Commerce", subject: "Business Studies", total: 71 },
        { usn: "12C003", class: "12th Grade - Commerce", subject: "Economics", total: 63 },
        { usn: "12C003", class: "12th Grade - Commerce", subject: "Mathematics", total: 58 },
        { usn: "12C003", class: "12th Grade - Commerce", subject: "English", total: 74 },
    ];

    let marksCreated = 0;
    for (const m of marksData) {
        const studentId = studentIds[m.usn];
        const subjectId = subjects[`${m.class}:${m.subject}`];
        if (!studentId || !subjectId) continue;

        await prisma.mark.upsert({
            where: { student_id_subject_id: { student_id: studentId, subject_id: subjectId } },
            update: { total: m.total, grade: grade(m.total) },
            create: { student_id: studentId, subject_id: subjectId, total: m.total, grade: grade(m.total) },
        });
        marksCreated++;
    }
    console.log(`✅ ${marksCreated} marks seeded`);

    console.log("\n🎉 Seed complete!\n");
    console.log("─────────────────────────────────────────");
    console.log("  Admin Login:  admin / admin123");
    console.log("  Student Login examples:");
    console.log("    USN: 10A001  |  DOB: 2009-03-15  (Aisha Rauf)");
    console.log("    USN: 11S002  |  DOB: 2008-09-25  (Maryam Rashid)");
    console.log("    USN: 12C002  |  DOB: 2007-05-11  (Sana Perveen)");
    console.log("─────────────────────────────────────────\n");
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => await prisma.$disconnect());
