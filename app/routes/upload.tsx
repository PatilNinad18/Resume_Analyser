import React, { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import Navbar from '~/components/Navbar';
import FileUploader from '~/components/FileUploader';
import { convertPdfToImage } from '~/lib/pdftoimg';
import { usePuterStore } from '~/lib/puter';
import { generateUUID } from '~/lib/utils';
// import { prepareInstructions } from '/constants/resumeConstants';
import { prepareInstructions } from 'resumeConstants';

function Upload() {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();

    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (file: File | null) => {
        setFile(file);
    };

    const handleAnalyze = async ({
        companyName,
        jobTitle,
        jobDescription,
        file,
    }: {
        companyName: string;
        jobTitle: string;
        jobDescription: string;
        file: File;
    }) => {
        try {
            setIsProcessing(true);
            setStatusText('Uploading the file...');

            const uploadedFile = await fs.upload([file]);
            if (!uploadedFile) {
                setIsProcessing(false);
                return setStatusText('Error: Failed to upload file');
            }

            setStatusText('Converting to image...');
            const imageResult = await convertPdfToImage(file);

            if (!imageResult.file) {
                console.error('PDF conversion error:', imageResult.error);
                setIsProcessing(false);
                return setStatusText(imageResult.error || 'Failed to convert PDF to image');
            }

            setStatusText('Uploading the image...');
            const uploadedImage = await fs.upload([imageResult.file]);

            if (!uploadedImage) {
                setIsProcessing(false);
                return setStatusText('Error: Failed to upload image');
            }

            setStatusText('Preparing data...');
            const uuid = generateUUID();

            const data: any = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName,
                jobTitle,
                jobDescription,
                feedback: '',
            };

            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            setStatusText('Analyzing resume...');
            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({
                    jobTitle,
                    jobDescription,
                    AIResponseFormat: 'json',
                })
            );

            if (!feedback) {
                setIsProcessing(false);
                return setStatusText('Error: Failed to analyze resume');
            }

            const feedbackText =
                typeof feedback.message.content === 'string'
                    ? feedback.message.content
                    : feedback.message.content[0].text;

            data.feedback = JSON.parse(feedbackText);

            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            setStatusText('Analysis complete, redirecting...');
            console.log(data);

            // optional navigation
            // navigate(`/resume/${uuid}`);
        } catch (err) {
            console.error(err);
            setStatusText('Unexpected error occurred');
            setIsProcessing(false);
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!file) return;

        const formData = new FormData(event.currentTarget);

        handleAnalyze({
            companyName: formData.get('company-name') as string,
            jobTitle: formData.get('job-title') as string,
            jobDescription: formData.get('job-description') as string,
            file,
        });
    };

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>

                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img
                                src="/images/resume-scan.gif"
                                alt="Scanning resume"
                                className="w-full"
                            />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips.</h2>
                    )}

                    {!isProcessing && (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input name="company-name" id="company-name" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input name="job-title" id="job-title" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="job-description">Job description</label>
                                <textarea rows={5} name="job-description" />
                            </div>

                            <div className="form-div">
                                <label>Upload resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            <button className="primary-button" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
}

export default Upload;
