import express from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcrypt";
import { adminAuth } from "../middlewares/authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

router.use(adminAuth);

// --- CLASSES ---
const classSchema = z.object({
    name: z.string().min(1)
});

router.get("/classes", async (req, res) => {
    const classes = await prisma.class.findMany();
    res.json(classes);
});

router.post("/classes", async (req, res) => {
    try {
        const { name } = classSchema.parse(req.body);
        const newClass = await prisma.class.create({ data: { name } });
        res.status(201).json(newClass);
    } catch (error) {
        res.status(400).json({ error: "Invalid data or class already exists" });
    }
});

router.delete("/classes/:id", async (req, res) => {
    try {
        await prisma.class.delete({ where: { id: req.params.id } });
        res.json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: "Cannot delete class" });
    }
});

// --- SUBJECTS ---
const subjectSchema = z.object({
    name: z.string().min(1),
    class_id: z.string().min(1)
});

router.get("/subjects", async (req, res) => {
    const { class_id } = req.query;
    const where = class_id ? { class_id: String(class_id) } : {};
    const subjects = await prisma.subject.findMany({ where, include: { class: true } });
    res.json(subjects);
});

router.post("/subjects", async (req, res) => {
    try {
        const { name, class_id } = subjectSchema.parse(req.body);
        const newSubject = await prisma.subject.create({ data: { name, class_id } });
        res.status(201).json(newSubject);
    } catch (error) {
        res.status(400).json({ error: "Invalid data" });
    }
});

router.delete("/subjects/:id", async (req, res) => {
    try {
        await prisma.subject.delete({ where: { id: req.params.id } });
        res.json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: "Cannot delete subject" });
    }
});

// --- STUDENTS ---
const studentSchema = z.object({
    first_name: z.string().min(1),
    usn: z.string().min(1),
    dob: z.string().min(1),
    class_id: z.string().min(1)
});

router.get("/students", async (req, res) => {
    const { class_id, usn } = req.query;
    let where: any = {};
    if (class_id) where.class_id = String(class_id);
    if (usn) where.usn = { contains: String(usn) };

    const students = await prisma.student.findMany({
        where,
        include: { class: true },
        orderBy: { usn: 'asc' }
    });
    const safe = students.map(({ dob_hash, ...rest }: any) => rest);
    res.json(safe);
});

router.post("/students", async (req, res) => {
    try {
        const { first_name, usn, dob, class_id } = studentSchema.parse(req.body);

        // Validate that the class exists first
        const classExists = await prisma.class.findUnique({ where: { id: class_id } });
        if (!classExists) {
            return res.status(400).json({ error: "Class not found" });
        }

        // Check for duplicate USN
        const existingStudent = await prisma.student.findUnique({ where: { usn } });
        if (existingStudent) {
            return res.status(400).json({ error: `USN "${usn}" already exists. Please use a unique USN.` });
        }

        const dob_hash = await bcrypt.hash(dob, 10);
        const newStudent = await prisma.student.create({
            data: { first_name, usn, dob_hash, class_id },
            include: { class: true }
        });

        // Strip the hash and return full data with class name
        const { dob_hash: _, ...safeStudent } = newStudent;
        return res.status(201).json(safeStudent);
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            return res.status(400).json({ error: "USN already exists." });
        }
        res.status(400).json({ error: "Invalid data provided." });
    }
});

router.delete("/students/:id", async (req, res) => {
    try {
        await prisma.student.delete({ where: { id: req.params.id } });
        res.json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: "Cannot delete student" });
    }
});

// --- MARKS ---
const markSchema = z.object({
    student_id: z.string().min(1),
    subject_id: z.string().min(1),
    total: z.number().min(0).max(100),
    grade: z.string().optional()
});

const calculateGrade = (total: number) => {
    if (total >= 90) return "A+";
    if (total >= 80) return "A";
    if (total >= 70) return "B";
    if (total >= 60) return "C";
    if (total >= 50) return "D";
    return "F";
};

router.get("/marks", async (req, res) => {
    const { class_id } = req.query;
    const where = class_id ? { student: { class_id: String(class_id) } } : {};
    const marks = await prisma.mark.findMany({
        where,
        include: { student: true, subject: true }
    });

    const sanitizedMarks = marks.map((m: any) => {
        delete m.student.dob_hash;
        return m;
    });

    res.json(sanitizedMarks);
});

router.post("/marks", async (req, res) => {
    try {
        const data = markSchema.parse(req.body);
        const grade = data.grade || calculateGrade(data.total);

        // Upsert logic based on unique constraint
        const existingMark = await prisma.mark.findUnique({
            where: {
                student_id_subject_id: {
                    student_id: data.student_id,
                    subject_id: data.subject_id
                }
            }
        });

        if (existingMark) {
            const updatedMark = await prisma.mark.update({
                where: { id: existingMark.id },
                data: { total: data.total, grade }
            });
            return res.json(updatedMark);
        } else {
            const newMark = await prisma.mark.create({
                data: { ...data, grade }
            });
            return res.status(201).json(newMark);
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: "Invalid data" });
    }
});

export default router;
