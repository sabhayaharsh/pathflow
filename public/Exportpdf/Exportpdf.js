const pdf = require('html-pdf');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

class ExportPdfFiles { 

    async getExperienceUserWisePDF(responseData) {
        const htmlFilePath = path.join(__dirname, 'pdftemplates', 'external-css.html');
        const cssFilePath = path.join(__dirname, 'pdftemplates', 'style.css');
    
        // Read the HTML template and CSS file
        let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
        let cssContent = fs.readFileSync(cssFilePath, 'utf8');
        htmlContent = `<style>${cssContent}</style>` + htmlContent;
    
        // Replace placeholders with dynamic data
        htmlContent = htmlContent
            .replace('{{experience.title}}', responseData.experience.title)
            .replace('{{createdon}}', new Date(responseData.createdon).toLocaleDateString());
    
        const insightsList = responseData.insights.map(insight => `<li>${insight}</li>`).join('');
        const noteslist = responseData.notes.map(notes => `<li>${notes}</li>`).join('');
        const taskslist = responseData.tasks
            .map(task => `<li>${task.name} ${task.status ? "<span>Pending</span>" : "<span>Complete</span>"}</li>`)
            .join('');
        const tagslist = responseData.tags.map(tags => `<li>${tags}</li>`).join('');
        let getGrade = '';
        let inputGrade = responseData.assessment.grade;
        //let displayothers = responseData.assessment.grade ? "style='display:block'" : "style='display:none'" ;
        // Grade logic
    
        let displayothers = "";
        if (Number(inputGrade) === 0) {
            getGrade = "Assessment not yet completed";
        } else if (Number(inputGrade) === 1) {
            getGrade = "D";
        } else if (Number(inputGrade) === 2) {
            getGrade = "C";
        } else if (Number(inputGrade) === 3) {
            getGrade = "B";
        } else if (Number(inputGrade) === 4) {
            getGrade = "A";
        } else {
            getGrade = "Assessment not yet completed";
        }

        const experincetowards = responseData.assessment.did_progress_towards_life_purpose ? "Yes" : "No";
        const helpanotherperson = responseData.assessment.did_help_another_person ? "Yes" : "No";
        const status = responseData.is_completed_assessment ? "Active" : "Completed";
        const filesHTML = responseData.files.slice(0, 10).map(file => 
            file.type === "image/png" 
                ? `<li><img src="${file.url}" class="img" alt="files"/></li>` 
                : `<li><span class="nobold">${file.original_filename}</span></li>`
        ).join('');
    
        const ifferentlycontent = responseData.assessment.do_differently;
        const Comments = responseData.assessment.comments;
    
        // Replace all placeholders with actual data
        htmlContent = htmlContent
            .replace('{{insights}}', insightsList)
            .replace('{{notelist}}', noteslist)
            .replace('{{tasklist}}', taskslist)
            .replace('{{taglist}}', tagslist)
            .replace('{{assessmentgrade}}', getGrade)
            .replace('{{experincetowards}}', experincetowards)
            .replace('{{helpanotherperson}}', helpanotherperson)
            .replace('{{filesHTML}}', filesHTML)
            .replace('{{ifferentlycontent}}', ifferentlycontent)
            .replace('{{Comments}}', Comments)
            .replace('{{status}}', status);

            const other1 = Number(inputGrade) ? "" : "others";
            const other2 = Number(inputGrade) ? "" : "others" ;
            const other3 = Number(inputGrade) ? "" : "others" ;
            const other4 = Number(inputGrade) ? "" : "others" ;

            htmlContent = htmlContent
            .replace('{{other1}}', other1)
            .replace('{{other2}}', other2)
            .replace('{{other3}}', other3)
            .replace('{{other4}}', other4);

        const options = {
            format: 'A4',
            orientation: 'portrait',
            border: {
                top: '1in',
                right: '1in',
                bottom: '1in',
                left: '1in',
            },
        };
    
        // Wrap PDF creation and S3 upload in a Promise
        return new Promise((resolve, reject) => {
            pdf.create(htmlContent, options).toFile(path.join(__dirname, 'output.pdf'), (err, res) => {
                if (err) {
                    console.log(err);
                    return reject('Error generating PDF');
                }
                const pdfFilePath = res.filename;
                const pdfFileContent = fs.readFileSync(pdfFilePath);
                const fileKey = `${Date.now().toString()}-output.pdf`;
    
                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: fileKey,
                    Body: pdfFileContent,
                    ContentType: 'application/pdf',
                };
    
                s3Client.send(new PutObjectCommand(uploadParams))
                    .then(() => {
                        const fileUrl = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    
                        // Optional: Clean up the local file
                        fs.unlinkSync(pdfFilePath);
    
                        // Resolve the promise with the S3 file URL
                        resolve(fileUrl);
                    })
                    .catch(err => {
                        console.error('Failed to upload file to S3:', err.message);
                        reject('Failed to upload file to S3');
                    });
            });
        });
    }    
}

module.exports = new ExportPdfFiles();