"use client";
import React, { useState } from 'react';

const beginnerSkills = [
    "Submerging",
    "Rhythmic Breathing",
    "Front Float",
    "Front Glide",
    "Back Float",
    "Back Glide",
    "Roll from back float to front",
    "Roll from front float to back",
    "Kicking",
    "Front Swim",
    "Front Crawl"
];

const intermediateSkills = [
    "Treading Water",
    "Freestyle Kicking",
    "Freestyle swim - proficiency",
    "Backstroke Kick",
    "Backstroke swim - proficiency"
];

const proficiencyLevels = [
    { value: 0, label: "0. Unable to attempt the skill" },
    { value: 1, label: "1. Unable to show skill without significant support" },
    { value: 2, label: "2. Inconsistently or with support is able to demonstrate the skill" },
    { value: 3, label: "3. Consistently demonstrates application of the skill" },
    { value: 4, label: "4. Demonstrates complete understanding of the skill" }
];

const levelMap: Record<number, string> = {
    1: 'Beginner',
    2: 'Intermediate',
    // Add other level mappings as needed
};

interface EvaluationFormProps {
  level: number;
  swimmerId: string;
  onSubmissionComplete: () => void;
}

const EvaluationForm: React.FC<EvaluationFormProps> = ({ level, swimmerId, onSubmissionComplete }) => {
    const levelName = levelMap[level] || 'Unknown';
    const skills = levelName === 'Beginner' ? beginnerSkills : intermediateSkills;
    const [evaluations, setEvaluations] = useState<Record<string, number>>({});
    const [comments, setComments] = useState<Record<string, string>>({});

    const handleEvalChange = (skill: string, value: number) => {
        setEvaluations(prev => ({ ...prev, [skill]: value }));
    };

    const handleCommentChange = (skill: string, text: string) => {
        setComments(prev => ({ ...prev, [skill]: text }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Here you would handle the form submission,
        // for example, by sending the data to your backend.
        console.log("Submitting for swimmer:", swimmerId);
        console.log("Evaluations:", evaluations);
        console.log("Comments:", comments);
        // alert("Evaluation submitted!");
        if (onSubmissionComplete) {
            onSubmissionComplete();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 p-4 border rounded-lg shadow-md bg-gray-100">
            <h2 className="text-2xl font-bold text-center">{levelName} Skill Evaluation</h2>
            {skills.map(skill => (
                <div key={skill} className="p-4 border rounded-md bg-white">
                    <h3 className="text-lg font-semibold">{skill}</h3>
                    <div className="flex items-center space-x-4 mt-2">
                        {proficiencyLevels.map(level => (
                            <label key={level.value} className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name={`${skill}-evaluation`}
                                    value={level.value}
                                    onChange={(e) => handleEvalChange(skill, parseInt(e.target.value))}
                                    className="radio radio-primary"
                                />
                                <span>{level.value}</span>
                            </label>
                        ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 bg-gray-50 rounded-md">
                        <textarea
                            placeholder="Comment"
                            onChange={(e) => handleCommentChange(skill, e.target.value)}
                            className="textarea textarea-bordered w-full"
                        />
                    </div>
                </div>
            ))}

            {levelName === 'Intermediate' && (
                 <div className="p-4 border rounded-md bg-white">
                    <h3 className="text-lg font-semibold">Freestyle swim - distance</h3>
                     <div className="flex items-center space-x-4 mt-2">
                         {[10, 15, 25, 50].map(distance => (
                             <label key={distance} className="flex items-center space-x-2">
                                 <input type="radio" name="freestyle-distance" value={distance} className="radio radio-primary" />
                                 <span>{distance} yards</span>
                             </label>
                         ))}
                     </div>
                     <div className="mt-2">
                        <textarea placeholder="Notes regarding the freestyle stroke, breathing, and kicking technique" className="textarea textarea-bordered w-full" />
                    </div>
                 </div>
            )}

            {levelName === 'Intermediate' && (
                <div className="p-4 border rounded-md bg-white">
                    <h3 className="text-lg font-semibold">Backstroke swim - distance</h3>
                    <div className="flex items-center space-x-4 mt-2">
                        {[10, 15, 25, 50].map(distance => (
                            <label key={distance} className="flex items-center space-x-2">
                                <input type="radio" name="backstroke-distance" value={distance} className="radio radio-primary" />
                                <span>{distance} yards</span>
                            </label>
                        ))}
                    </div>
                    <div className="mt-2">
                        <textarea placeholder="Notes regarding the backstroke stroke, breathing, and kicking technique" className="textarea textarea-bordered w-full" />
                    </div>
                </div>
            )}

            <div className="p-4 border rounded-md bg-white">
                <h3 className="text-lg font-semibold">Next steps</h3>
                <div className="flex flex-col space-y-2 mt-2">
                    <label><input type="radio" name="next-steps" value="remain-beginner" className="radio radio-primary" /> Beginner - remain in current beginner group</label>
                    <label><input type="radio" name="next-steps" value="progress-beginner" className="radio radio-primary" /> Beginner - showed significant progress and ready to move to next group</label>
                    <label><input type="radio" name="next-steps" value="move-intermediate" className="radio radio-primary" /> Intermediate - able to do the beginner skills and swim independently for short distances</label>
                    <label><input type="radio" name="next-steps" value="ready-swim-team" className="radio radio-primary" /> Ready for Swim Team!</label>
                </div>
            </div>

            <div className="p-4 border rounded-md bg-white">
                <h3 className="text-lg font-semibold">Additional Comments</h3>
                <div className="mt-3 pt-3 border-t border-gray-200 bg-gray-50 rounded-md">
                    <textarea
                        placeholder="Any additional notes about the swimmer and the session"
                        className="textarea textarea-bordered w-full"
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Submit Evaluation
                </button>
            </div>
        </form>
    );
};

export default EvaluationForm;
