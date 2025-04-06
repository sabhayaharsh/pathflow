const path = require('path');
const fs = require('fs');
const pdf = require('html-pdf');
const puppeteer = require('puppeteer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
function invoiceexportpdf(printdata) {
    const data = printdata[0];
    const startDate = printdata[0].StartDate.toLocaleDateString('en-US');
    const endDate = printdata[0].EndDate.toLocaleDateString('en-US'); 
    const invoicedate = printdata[0].PaymentDate.toLocaleDateString('en-US'); 
    return new Promise(async (resolve, reject) => {
        try {
            const filePath = path.join(__dirname, 'template.html');
            const options = { format: 'A4' };

            // Read and prepare HTML content
            let htmlContent = fs.readFileSync(filePath, 'utf8');
            htmlContent = htmlContent.replace('{{INVOICEID}}', data.InvoiceNumber);
            htmlContent = htmlContent.replace('{{INVOICEDATE}}', invoicedate);
            htmlContent = htmlContent.replace('{{NAME}}', data.name);
            htmlContent = htmlContent.replace('{{EMAIL}}', data.email);
            htmlContent = htmlContent.replace('{{PHONENUMBER}}', data.phone_number);
            htmlContent = htmlContent.replace('{{STARTDATE}}', startDate);
            htmlContent = htmlContent.replace('{{ENDDATE}}', endDate);
            htmlContent = htmlContent.replace('{{TOTALAMOUNT}}', data.TotalAmount);
            htmlContent = htmlContent.replace('{{TOTALAMOUNT}}', data.TotalAmount);
            htmlContent = htmlContent.replace('{{TOTALAMOUNT}}', data.TotalAmount);
            htmlContent = htmlContent.replace('{{TERMOPTIONS}}', data.TermOptions);

            // Generate the PDF and save it to the current directory
            var dateDisplay = new Date(Date.now() - (new Date().getTimezoneOffset() * 1000 * 60)).toJSON().slice(0, 10);
            const fileName = `Pathmaker_Invoice_${dateDisplay}`;
            const savePath = path.join(__dirname, fileName); // Current directory for saving the PDF


            const browser = await puppeteer.launch({
                  headless: true,   // Run browser in headless mode for speed
                  args: ["--no-sandbox",
                            "--disable-setuid-sandbox",
                            '--disable-dev-shm-usage',
                            '--disable-gpu',
                            '--no-zygote'
                        ] // Useful for some environments
                });
            
                const page = await browser.newPage();

            htmlContent = htmlContent.replace('{{INVOICEID}}', data.InvoiceNumber);
            htmlContent = htmlContent.replace('{{INVOICEDATE}}', invoicedate);
            htmlContent = htmlContent.replace('{{NAME}}', data.name);
            htmlContent = htmlContent.replace('{{EMAIL}}', data.email);
            htmlContent = htmlContent.replace('{{PHONENUMBER}}', data.phone_number);
            htmlContent = htmlContent.replace('{{STARTDATE}}', startDate);
            htmlContent = htmlContent.replace('{{ENDDATE}}', endDate);
            htmlContent = htmlContent.replace('{{TOTALAMOUNT}}', data.TotalAmount);
            htmlContent = htmlContent.replace('{{TOTALAMOUNT}}', data.TotalAmount);
            htmlContent = htmlContent.replace('{{TOTALAMOUNT}}', data.TotalAmount);
            htmlContent = htmlContent.replace('{{TERMOPTIONS}}', data.TermOptions);

            // Generate the PDF and save it to the current directory
            var dateDisplay = new Date(Date.now() - (new Date().getTimezoneOffset() * 1000 * 60)).toJSON().slice(0, 10);

            await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
            const pdfBuffer = await page.pdf({
                      format: 'A4',
                      printBackground: true,
                      
                  });
                // Close the browser
                await browser.close();
            
                const pdfKey = `output/${fileName}.pdf`; // Use a safe filename
                const bucketName = process.env.BUCKET_NAME;
                const params = {
                    Bucket: bucketName, // Your S3 bucket name
                    Key: pdfKey,
                    Body: pdfBuffer,
                    ContentType: 'application/pdf'
                };
            
                try {
                    const uploadCommand = new PutObjectCommand(params);
                    const uploadResult = await s3Client.send(uploadCommand);
                    //console.log(`PDF uploaded to S3 at: https://${bucketName}.s3.amazonaws.com/${pdfKey}`);
                    const pdfurls = `https://${bucketName}.s3.amazonaws.com/${pdfKey}`;
                    resolve(pdfurls)
                    return `https://${bucketName}.s3.amazonaws.com/${pdfKey}`; // Return the S3 URL
                } catch (error) {
                    console.error('Error uploading to S3:', error);
                    throw error; // Rethrow the error for further handling
                }


        } catch (error) {
            reject({ error: error.message });
        }
    });
}

module.exports = { invoiceexportpdf };
