import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import { BarChart, Save } from 'lucide-react';

interface ClassItem {
    id: string;
    name: string;
}

interface SubjectItem {
    id: string;
    name: string;
    class_id: string;
}

interface StudentItem {
    id: string;
    first_name: string;
    usn: string;
    class_id: string;
}

interface MarkItem {
    id?: string;
    student_id: string;
    subject_id: string;
    total: number;
    grade?: string;
}

const MarksManager: React.FC = () => {
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [students, setStudents] = useState<StudentItem[]>([]);
    const [_existingMarks, setExistingMarks] = useState<MarkItem[]>([]);

    // Selection State
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');

    // Marks Input State - Map of student_id -> total marks
    const [marksData, setMarksData] = useState<Record<string, string>>({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchClassDetails(selectedClassId);
        } else {
            setSubjects([]);
            setStudents([]);
            setSelectedSubjectId('');
            setMarksData({});
        }
    }, [selectedClassId]);

    useEffect(() => {
        if (selectedClassId && selectedSubjectId) {
            fetchExistingMarks(selectedClassId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedClassId, selectedSubjectId]);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/admin/classes');
            setClasses(res.data);
            if (res.data.length > 0) {
                setSelectedClassId(res.data[0].id);
            }
        } catch (_err) {
            setError('Failed to load classes');
        } finally {
            setLoading(false);
        }
    };

    const fetchClassDetails = async (classId: string) => {
        setLoading(true);
        try {
            const [subsRes, studsRes] = await Promise.all([
                api.get(`/admin/subjects?class_id=${classId}`),
                api.get(`/admin/students?class_id=${classId}`)
            ]);
            setSubjects(subsRes.data);
            setStudents(studsRes.data);

            if (subsRes.data.length > 0) {
                setSelectedSubjectId(subsRes.data[0].id);
            } else {
                setSelectedSubjectId('');
            }
        } catch (_err) {
            setError('Failed to load class details');
        } finally {
            setLoading(false);
        }
    };

    const fetchExistingMarks = async (classId: string) => {
        try {
            const res = await api.get(`/admin/marks?class_id=${classId}`);
            setExistingMarks(res.data);

            // Populate input fields with existing data for the selected subject
            const newMarksData: Record<string, string> = {};
            const subjectMarks = res.data.filter((m: MarkItem) => m.subject_id === selectedSubjectId);

            subjectMarks.forEach((m: MarkItem) => {
                newMarksData[m.student_id] = m.total.toString();
            });

            setMarksData(newMarksData);
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkChange = (studentId: string, value: string) => {
        // Only allow numbers and empty string
        if (value !== '' && !/^\d+$/.test(value)) return;

        // Cap at 100
        if (value !== '' && parseInt(value) > 100) return;

        setMarksData(prev => ({
            ...prev,
            [studentId]: value
        }));

        // Clear success message on edit
        setSuccess('');
    };

    const calculateGradeDisplay = (totalStr: string) => {
        if (!totalStr) return '-';
        const total = parseInt(totalStr);
        if (isNaN(total)) return '-';

        if (total >= 90) return "A+";
        if (total >= 80) return "A";
        if (total >= 70) return "B";
        if (total >= 60) return "C";
        if (total >= 50) return "D";
        return "F";
    };

    const saveMarks = async () => {
        if (!selectedClassId || !selectedSubjectId) return;
        setSaving(true);
        setError('');
        setSuccess('');

        let hasError = false;

        // Process all students that have a mark entered
        const promises = Object.entries(marksData).map(async ([studentId, markValue]) => {
            if (markValue === '') return; // Skip empty

            try {
                await api.post('/admin/marks', {
                    student_id: studentId,
                    subject_id: selectedSubjectId,
                    total: parseInt(markValue)
                });
            } catch (err) {
                hasError = true;
                console.error(`Failed to save mark for student ${studentId}`, err);
            }
        });

        await Promise.all(promises);

        setSaving(false);

        if (hasError) {
            setError('Some marks failed to save. Please try again.');
        } else {
            setSuccess('Marks saved successfully!');
            fetchExistingMarks(selectedClassId); // Refresh data
        }
    };

    if (loading && classes.length === 0) return <div>Loading marks manager...</div>;

    return (
        <div className="bg-white rounded-xl shadow-lg border border-yellow-200 p-6 md:p-8">
            <div className="flex items-center mb-8 border-b-2 border-yellow-200 pb-4">
                <BarChart className="w-8 h-8 text-yellow-600 mr-3" />
                <h2 className="text-3xl font-black text-black tracking-widest uppercase">Marks Entry & Management</h2>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded mb-6 font-bold flex shadow-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded mb-6 font-bold flex shadow-sm">
                    {success}
                </div>
            )}

            {/* Selection Form */}
            <div className="bg-gradient-to-br from-yellow-50 to-white p-6 rounded-xl mb-8 border border-yellow-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest pl-1">Select Class</label>
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-yellow-200 rounded-lg focus:ring-0 focus:border-yellow-500 bg-white font-bold text-black"
                        >
                            {classes.length === 0 && <option value="">No classes available</option>}
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest pl-1">Select Subject</label>
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                            disabled={subjects.length === 0}
                            className="w-full px-4 py-3 border-2 border-yellow-200 rounded-lg focus:ring-0 focus:border-yellow-500 bg-white font-bold text-black disabled:bg-gray-100 disabled:text-gray-400"
                        >
                            {subjects.length === 0 && <option value="">No subjects mapped to this class</option>}
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Configuration Status Messages */}
            {selectedClassId && students.length === 0 && (
                <div className="text-center p-8 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                    No students are registered in this class. Please add students first.
                </div>
            )}

            {selectedClassId && students.length > 0 && subjects.length === 0 && (
                <div className="text-center p-8 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                    No subjects are assigned to this class. Please assign subjects first.
                </div>
            )}

            {/* Marks Entry Table */}
            {selectedClassId && selectedSubjectId && students.length > 0 && (
                <>
                    <div className="mb-4 flex justify-between items-center">
                        <h3 className="text-lg font-black text-black">
                            Entering marks for: <span className="text-yellow-600">{subjects.find(s => s.id === selectedSubjectId)?.name}</span>
                        </h3>

                        <button
                            onClick={saveMarks}
                            disabled={saving}
                            className="bg-gradient-to-r from-yellow-400 to-yellow-500 border border-yellow-600 text-black font-extrabold px-5 py-2 rounded-lg hover:from-yellow-500 hover:to-yellow-600 flex items-center transition disabled:opacity-50 shadow-md"
                        >
                            {saving ? 'Saving...' : <><Save className="w-5 h-5 mr-2" /> Save All Marks</>}
                        </button>
                    </div>

                    <div className="overflow-x-auto shadow-md border-2 border-yellow-200 rounded-xl">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-yellow-100 to-yellow-50 border-b border-yellow-300">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black text-black uppercase tracking-widest w-1/3">Student</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-black uppercase tracking-widest w-1/4">USN</th>
                                    <th className="px-6 py-4 text-center text-xs font-black text-black uppercase tracking-widest border-l border-yellow-200">Total Marks (0-100)</th>
                                    <th className="px-6 py-4 text-center text-xs font-black text-black uppercase tracking-widest w-32 border-l border-yellow-200">Grade Result</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {students.map((student) => {
                                    const markValue = marksData[student.id] || '';
                                    const gradeInfo = calculateGradeDisplay(markValue);

                                    return (
                                        <tr key={student.id} className="hover:bg-yellow-50/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-black border-r border-gray-100">{student.first_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono font-bold border-r border-gray-100">{student.usn}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center bg-gray-50/50 border-r border-gray-100">
                                                <input
                                                    type="text"
                                                    value={markValue}
                                                    onChange={(e) => handleMarkChange(student.id, e.target.value)}
                                                    placeholder="-"
                                                    className="w-24 px-3 py-2 border-2 border-yellow-200 rounded-md text-center font-black text-xl text-black focus:ring-0 focus:border-yellow-500 bg-white"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-black tracking-widest ${gradeInfo === '-' ? 'bg-gray-100 text-gray-400 border border-gray-200' :
                                                    gradeInfo.includes('A') ? 'bg-green-100 text-green-800 border border-green-200' :
                                                        gradeInfo.includes('B') ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                                            gradeInfo.includes('C') ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                                                gradeInfo.includes('D') ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                                                    'bg-red-100 text-red-800 border border-red-200'
                                                    }`}>
                                                    {gradeInfo}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={saveMarks}
                            disabled={saving}
                            className="bg-gradient-to-r from-yellow-400 to-yellow-500 border border-yellow-600 text-black font-extrabold px-8 py-3 rounded-lg hover:from-yellow-500 hover:to-yellow-600 flex items-center transition disabled:opacity-50 shadow-lg transform hover:-translate-y-1"
                        >
                            {saving ? 'Saving...' : <><Save className="w-6 h-6 mr-2" /> Save All Marks</>}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default MarksManager;
