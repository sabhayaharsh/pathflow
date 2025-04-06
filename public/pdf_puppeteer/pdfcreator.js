const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

class pdfcreator {

  async generatePDF(data) {
    // Launch a headless browser
    const browser = await puppeteer.launch({
        headless: true, // Run browser in headless mode for speed
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote'
        ], // Useful for some environments
    });

    const page = await browser.newPage();
  
      function getBase64Image(filePath) {
          let image = fs.readFileSync(filePath);
          return Buffer.from(image).toString('base64');
      }  
      function getSvgContent(filePath) {
          const svgContent = fs.readFileSync(filePath, 'utf8');
          return Buffer.from(svgContent).toString('base64');
      }
      
      let base64Image = getBase64Image(path.resolve(__dirname, './htmlfiles/print-header-bg.jpg'));
      let base64Imagelogo = getBase64Image(path.resolve(__dirname, './htmlfiles/pathmaker-logo-w.png'));
      let base64ImageMP4 = getBase64Image(path.resolve(__dirname, './htmlfiles/1200x600.png'));
      let base64ImageMP4Svg = getSvgContent(path.resolve(__dirname, './htmlfiles/mp4.svg'));
      let base64ImagePDFSvg = getSvgContent(path.resolve(__dirname, './htmlfiles/PDF.svg'));
  
      let jpeglogo = getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/jpeg.png'));
      let pnglogo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/images.png'));
      let heiclogo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/heic.png'));          
      let movlogo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/mov.png'));  
      let mp33logo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/mpicon3.png'));
      let mp44logo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/mp4.png'));
      let pdflogo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/pdf.png'));

          const date = new Date(data.createdon);
          const formattedDate = date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            let ExperinceStatus = "";
            if (data.is_completed_assessment==="1") {
              ExperinceStatus =`<button class="badge bg-primary p-2 px-3" type="submit">
                Closed
              </button>` ;
            }
            else
            {
              ExperinceStatus =`<button class="badge  bg-primary p-2 px-3" type="submit">
              Active
            </button>`
            }
      
      let imageTag = `<img src="data:image/png;base64,${base64Image}" class="img-fluid w-100" alt="Image"/>`;
      let imageTaglogo = `<img src="data:image/png;base64,${base64Imagelogo}" class="img-fluid header-logo" alt="Pathmaker"/>`;
      let imageTagPng =  `<img alt="image" src="data:image/png;base64,${base64ImageMP4}" />`;
      
      let imageTagPDFSvg = `<img alt="image" src="data:image/svg+xml;base64,${base64ImagePDFSvg}" />`;
      let imageTagMP4 = `<img alt="image" src="data:image/svg+xml;base64,${base64ImageMP4Svg}" />`;
  
    // Load your HTML file
    const htmlPath = path.resolve(__dirname,'htmlfiles', 'knowledgeExperience.html');
    console.log(htmlPath);
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
   
    const insightsList = data.insights && data.insights.length > 0 
    ? data.insights.map(insight => `
        <div style="border: 1px solid #d3ded3; padding: 10px; display: inline-block; border-radius: 10px; margin-bottom: 10px; width: 100%;">
            <div>${insight}</div>
        </div>

    `).join('')
    : "<table><tbody><tr><td>No insight available</td></tr></tbody></table>";
    
    const noteslist = data.notes && data.notes.length > 0 
    ? data.notes.map(note => `
        <div style="border: 1px solid #d3ded3; padding: 10px; display: inline-block; border-radius: 10px; margin-bottom: 10px; width: 100%;">
            <div>${note}</div>
        </div>
     
    `).join('')
    : "<table><tbody><tr><td>No note available</td></tr></tbody></table>";
         
          const taskslist = data.tasks && data.tasks.length > 0 
          ? data.tasks.map(task => {       
              return `    
              <div style="border: 1px solid #d3ded3; padding: 10px; display: inline-block; border-radius: 10px; margin-bottom: 10px; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                 <div>${task.name}</div>
            <div>
                 ${task.status === 0 
                    ? '<button class="badge bg-primary p-2 px-3" type="button">Active</button>' 
                    : '<button class="badge bg-success p-2 px-3" type="button">Closed</button>'}
            </div>
            </div>
        </div>

              `;
          }).join('')
          : "<table><tbody><tr><td>No task available</td></tr></tbody></table>";
            
          
          const tagslist = data.tags && data.tags.length > 0 
            ? data.tags.map(tag => `<button class="btn btn-custom me-2 rounded-pill px-4" style="margin-top: 10PX;">${tag}</button>`).join('') : "<tbody><tr><td>No tag available</td></tr></tbody>";

          let getGrade = '';
          let inputGrade = data.assessment.grade;
          let assementcomplete = data.is_completed_assessment;
          
          if (Number(inputGrade) === 0 && data.is_completed_assessment === "1") {
            getGrade = `
                <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                    Highly Dissatisfied
                </button>
            `;
          } else if (Number(inputGrade) === 1) {
            
            getGrade = `
                <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                    Dissatisfied
                </button>`;
          } else if (Number(inputGrade) === 2) {
            
            getGrade = `
                <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                    Neutral
                </button>`;
          } else if (Number(inputGrade) === 3) {
              
            getGrade = `
                <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                    Satisfied
                </button>`;
          } else if (Number(inputGrade) === 4) {
             
            getGrade = `
            <div>
                <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                    Highly Satisfied
                </button>
            </div>    
            `;
          } else {
              //getGrade = "<br><p>Assessment not yet completed</p>";
              getGrade = `<div class='alert alert-danger' role='alert'>Result not yet closed</div>`;
          }
      
  
let ontract = "";
if (data.assessment.did_progress_towards_life_purpose==="1") {
  ontract = '<button class="btn btn-outline-custom active me-2 rounded-pill px-4">Yes</button>';
}
else
{
  ontract = '<button class="btn btn-outline-custom active me-2 rounded-pill px-4">No</button>';
}
   let helpanotherperson = "";
   if (data.assessment.did_help_another_person==="1") {
       helpanotherperson = '<button class="btn btn-outline-custom active me-2 rounded-pill px-4">Yes</button>';
   }
   else
   {
       helpanotherperson = '<button class="btn btn-outline-custom active me-2 rounded-pill px-4">No</button>';
   }
 
   
   let do_differently = "";

   if (data.assessment.do_differently != "") {
        do_differently = data.assessment.do_differently;
    }
    else
    {
        //helpanotherperson = '<button class="btn btn-outline-custom me-2 rounded-pill px-4">No</button>';
        do_differently = "No data available";
    }

    let comments = ""

    if (data.assessment.comments != "") {
      comments = data.assessment.comments;
    }
    else
    {
      comments = "No data available";
    }
    if (data.is_completed_assessment === "0") {
      comments = "No data available";
      do_differently = "No data available";
      helpanotherperson = "No data available";
      ontract = "No data available";
   }

       let filesHTML = "";
       console.log("data",data.files);
       console.log(data.files.length);
       
       filesHTML += `<table>`;
       if (data.files.length != 0) {
        data.files.forEach(element => {
               if (element.type==='application/pdf') {
                   filesHTML += `
                           <tr>
                               <td><div class="image-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${pdflogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               } 
               if (element.original_filename.includes('.mov')) {
                filesHTML += `
                        <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${movlogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>
                        `
            }
               if (element.original_filename.includes('.mp3')) {
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${mp33logo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
                           
               }
               if ((element.original_filename.includes('.mp4'))){
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${mp44logo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }
               if ((element.original_filename.includes('.wav'))){
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${mp44logo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }
               if ((element.original_filename.includes('.jpg') || element.original_filename.includes('.jpeg'))) {
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${jpeglogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }              
               if (element.original_filename.includes('.png')) {
                   filesHTML += `
                            <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${pnglogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }              
               if (element.original_filename.includes('.heic')) {
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${heiclogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }              
           });
       }
       else
       {
           filesHTML += `<tr><td>No file available</td></tr>`;
       }
              
       filesHTML += `</table>`      
    
    htmlContent = htmlContent.replace('{{experience.title}}', data.experience.title)
    htmlContent = htmlContent.replace('{{createdate}}', formattedDate)
    htmlContent = htmlContent.replace('{{PathmakerimageTag}}', imageTag)
    htmlContent = htmlContent.replace('{{Pathmakerlogo}}', imageTaglogo)
    htmlContent = htmlContent.replace('{{imageTagPng}}', imageTagPng)
    htmlContent = htmlContent.replace('{{imageTagPDFSvg}}', imageTagPDFSvg)
    htmlContent = htmlContent.replace('{{imageTagMP4}}', imageTagMP4)
    htmlContent = htmlContent.replace('{{insightsList}}', insightsList)
    htmlContent = htmlContent.replace('{{noteslist}}', noteslist)
    htmlContent = htmlContent.replace('{{taskslist}}', taskslist)
    htmlContent = htmlContent.replace('{{tagslist}}', tagslist)
    htmlContent = htmlContent.replace('{{getGrade}}', getGrade)
    htmlContent = htmlContent.replace('{{ontract}}', ontract)
    htmlContent = htmlContent.replace('{{ExperinceStatus}}', ExperinceStatus)
    htmlContent = htmlContent.replace('{{helpanotherperson}}', helpanotherperson)
    htmlContent = htmlContent.replace('{{do_differently}}', do_differently)
    htmlContent = htmlContent.replace('{{comments}}', comments)
    htmlContent = htmlContent.replace('{{filesHTML}}', filesHTML)
  
  
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
  
    
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          
      });
    // Close the browser
    await browser.close();

    const safeTitle = data.experience.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const pdfKey = `output/${safeTitle}.pdf`; // Use a safe filename
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
        return `https://${bucketName}.s3.amazonaws.com/${pdfKey}`; // Return the S3 URL
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw error; // Rethrow the error for further handling
    }
  }


  async decisionpdfexport(responseData){

   const decisiondata = responseData;
   const browser = await puppeteer.launch({
    headless: true, // Run browser in headless mode for speed
        args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote'
        ], // Useful for some environments
    });
    const page = await browser.newPage();
  
      function getBase64Image(filePath) {
          let image = fs.readFileSync(filePath);
          return Buffer.from(image).toString('base64');
      }  
      function getSvgContent(filePath) {
          const svgContent = fs.readFileSync(filePath, 'utf8');
          return Buffer.from(svgContent).toString('base64');
      }
      const date = new Date(decisiondata.CreatedDate);
          const formattedDate = date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
      let base64Image = getBase64Image(path.resolve(__dirname, './htmlfiles/print-header-bg.jpg'));
      let base64Imagelogo = getBase64Image(path.resolve(__dirname, './htmlfiles/pathmaker-logo-w.png'));
      let base64ImageMP4 = getBase64Image(path.resolve(__dirname, './htmlfiles/1200x600.png'));
      let base64ImageMP4Svg = getSvgContent(path.resolve(__dirname, './htmlfiles/mp4.svg'));
      let base64ImagePDFSvg = getSvgContent(path.resolve(__dirname, './htmlfiles/PDF.svg'));
      
      let jpeglogo = getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/jpeg.png'));
      let pnglogo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/images.png'));
      let heiclogo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/heic.png'));          
      let movlogo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/mov.png'));  
      let mp33logo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/mpicon3.png'));
      let mp44logo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/mp4.png'));
      let pdflogo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/pdf.png'));

            let ExperinceStatus = "";
            if (decisiondata.is_completed_assessment==="1") {
              ExperinceStatus =`<button class="badge bg-primary p-2 px-3" type="submit">
                Closed
              </button>` ;
            }
            else
            {
              ExperinceStatus =`<button class="badge bg-primary p-2 px-3" type="submit">
              Active
            </button>`
            }
            let imageTag = `<img src="data:image/png;base64,${base64Image}" class="print-header-bg.jpg" style="width: 100%" alt="Image"/>`;
      let imageTaglogo = `<img src="data:image/png;base64,${base64Imagelogo}" class="img-fluid header-logo" alt="Pathmaker"/>`;
      let imageTagPng =  `<img alt="image" src="data:image/png;base64,${base64ImageMP4}" />`;
      
      let imageTagPDFSvg = `<img alt="image" src="data:image/svg+xml;base64,${base64ImagePDFSvg}" />`;
      let imageTagMP4 = `<img alt="image" src="data:image/svg+xml;base64,${base64ImageMP4Svg}" />`;
    
      const goals = decisiondata.goals && decisiondata.goals.length > 0 
      ? decisiondata.goals.map(goal => `
        <div style="border: 1px solid #d3ded3; padding: 10px; display: inline-block; border-radius: 10px; margin-bottom: 10px; width: 100%;">
            <div>
                <h4 class="text-custom subtitle">${goal.name}</h4>
            </div>
            <div style="display: table;">
                ${goal.description}
            </div>
        </div>

      `).join('')
      : '<table><tbody><tr><td>No goal available</td></tr></tbody></table>';
  
        let importantce =""
    
    const successCriteria = decisiondata.successCriteria && decisiondata.successCriteria.length > 0 
    ? decisiondata.successCriteria.map(criteria => {
        let importantce = criteria.importance === "1" ? "Must Have" : "Should Have";
        let priority = criteria.priority === "1" ? "High" 
                      : criteria.priority === "2" ? "Medium" 
                      : "Low";

        return ` 
        <div style="border: 1px solid #d3ded3; padding: 10px; display: inline-block; border-radius: 10px; margin-bottom: 10px; width: 100%;">
            <div>
                <h4 class="text-custom subtitle">Description</h4>
            </div>
            <div class="mb-3">${criteria.name}</div>

            <div>
                <h4 class="text-custom subtitle">Criteria</h4>
            </div>
            <div class="mb-3">${importantce}</div>

            <div>
                <h4 class="text-custom subtitle">Priority</h4>
            </div>
            <div>${priority}</div>
        </div>

        `;
    }).join('')
    : "<table><tbody><tr><td>No success criteria available</td></tr></tbody></table>";
    let optionshtml = "";
    

    if (decisiondata.successCriteria && decisiondata.successCriteria.length > 0) {
      decisiondata.successCriteria.forEach(option => {
        optionshtml += `
            <div style="border: 1px solid #d3ded3; padding: 10px; display: inline-block; border-radius: 10px; margin-bottom: 10px; width: 100%;">
              <div>${option.name}</div>
            </div> `;
      });
  } else {
    optionshtml = "<table><tbody><tr><td>No option available</td></tr></tbody></table>";
  }


  const decisions = decisiondata.decisions && decisiondata.decisions.length > 0 
    ? decisiondata.decisions.map(decision => {       
        return `
        <div style="border: 1px solid #d3ded3; padding: 10px; display: inline-block; border-radius: 10px; margin-bottom: 10px; width: 100%;">
            <div>
                <h4 class="text-custom subtitle">Name</h4>
            </div>
            <div class="mb-3">${decision.name}</div>

            <div>
                <h4 class="text-custom subtitle">Reason</h4>
            </div>
            <div class="mb-3">${decision.reason}</div>
        </div> `;
    }).join('')
    : "<table><tbody><tr><td>No decision available</td></tr></tbody></table>";

const tasks = decisiondata.tasks && decisiondata.tasks.length > 0 
? decisiondata.tasks.map(task => {       
    return ` 
    <div style="border: 1px solid #d3ded3; padding: 10px; display: inline-block; border-radius: 10px; margin-bottom: 10px; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
           <div>${task.name}</div>
            <div>
            ${task.status === 0 
                ? '<button class="badge bg-primary p-2 px-3" type="button">Active</button>' 
                : '<button class="badge bg-success p-2 px-3" type="button">Closed</button>'}
             </div>
        </div>
    </div> `;
}).join('')
: "<table><tbody><tr><td>No task available</td></tr></tbody></table>";
// const tagslist = decisiondata.tags.map(tags => `<button class="btn btn-custom me-2 rounded-pill px-4">${tags}</button>`).join('');
const tagslist = decisiondata.tags && decisiondata.tags.length > 0 
    ? decisiondata.tags.map(tag => `<button class="btn btn-custom me-2 rounded-pill px-4" style="margin-top: 10PX;">${tag}</button>`).join('')
    : "<div>No tag available</div>";
let filesHTML = "";
console.log(decisiondata.files);
console.log(decisiondata.files.length);

filesHTML += `<table>`;
       if (decisiondata.files.length != 0) {
        decisiondata.files.forEach(element => {
               if (element.type==='application/pdf') {
                   filesHTML += `
                           <tr>
                               <td><div class="image-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${pdflogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               } 
               if (element.original_filename.includes('.mov')) {
                filesHTML += `
                        <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${movlogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>
                        `
            }
               if (element.original_filename.includes('.mp3')) {
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${mp33logo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
                           
               }
               if ((element.original_filename.includes('.mp4'))){
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${mp44logo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }
               if ((element.original_filename.includes('.wav'))){
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${mp44logo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }
               if ((element.original_filename.includes('.jpg') || element.original_filename.includes('.jpeg'))) {
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${jpeglogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }              
               if (element.original_filename.includes('.png')) {
                   filesHTML += `
                            <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${pnglogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }              
               if (element.original_filename.includes('.heic')) {
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${heiclogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }              
           });
       }
       else
       {
           filesHTML += `<tr><td>No file available</td></tr>`;
       }
              
       filesHTML += `</table>`      

        let getGrade = '';
          let inputGrade = decisiondata.assessment.grade;
          
            if (Number(inputGrade) === 0 && decisiondata.is_completed_assessment === "1") {
                getGrade = ` <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                  Highly Dissatisfied
                </button> `;
                // getGrade = `
                // <ul class="grade">
                //     <li><span>A</span></li>
                //     <li><span>B</span></li>
                //     <li><span>C</span></li>
                //     <li><span>D</span></li>
                //     <li><span class="active">F</span></li>
                //   </ul> `;
          } else if (Number(inputGrade) === 1) {
            getGrade = ` <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                  Dissatisfied
            </button> `;
            //   getGrade = `
            //   <ul class="grade">
            //       <li><span>A</span></li>
            //       <li><span>B</span></li>
            //       <li><span>C</span></li>
            //       <li><span class='active'>D</span></li>
            //       <li><span>F</span></li>
            //     </ul>            
            //   `;
          } else if (Number(inputGrade) === 2) {
            getGrade = ` <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                  Neutral
            </button> `;
            //   getGrade = `
            //   <ul class="grade">
            //       <li><span>A</span></li>
            //       <li><span>B</span></li>
            //       <li><span class='active'>C</span></li>
            //       <li><span>D</span></li>
            //       <li><span>F</span></li>
            //     </ul>            
            //   `;
          } else if (Number(inputGrade) === 3) {
              //getGrade = "<ul class='grade'><li><li><span class='active'>B</span><li></ul>";
              getGrade = ` <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                  Satisfied
            </button> `;
            //   getGrade = `
            //   <ul class="grade">
            //       <li><span>A</span></li>
            //       <li><span class="active">B</span></li>
            //       <li><span>C</span></li>
            //       <li><span>D</span></li>
            //       <li><span>F</span></li>
            //     </ul>            
            //   `;
          } else if (Number(inputGrade) === 4) {
             // getGrade = "<ul class='grade'><li><li><span class='active'>A</span><li></ul>";
             getGrade = ` <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                     Highly Satisfied
            </button> `;
            //   getGrade = `
            //   <ul class="grade">
            //       <li><span class='active'>A</span></li>
            //       <li><span>B</span></li>
            //       <li><span>C</span></li>
            //       <li><span>D</span></li>
            //       <li><span>F</span></li>
            //     </ul>            
            //   `;
          } else {
              getGrade = "<div class='alert alert-danger' role='alert'>Result not yet closed</div>";
          }

  let ontract = "";
  if (decisiondata.assessment.did_progress_towards_life_purpose==="1") {
    ontract = '<button class="btn btn-outline-custom active me-2 rounded-pill px-4">Yes</button>';
}
else
{
    ontract = '<button class="btn btn-outline-custom active me-2 rounded-pill px-4">No</button>';
}

  let helpanotherperson = "";
  if (decisiondata.assessment.did_help_another_person==="1") {
      helpanotherperson = '<button class="btn btn-outline-custom active me-2 rounded-pill px-4">Yes</button>';
  }
  else
  {
      helpanotherperson = '<button class="btn btn-outline-custom active me-2 rounded-pill px-4">No</button>';
  }

  
  let do_differently = "";

  if (decisiondata.assessment.do_differently != "") {
       do_differently = decisiondata.assessment.do_differently;
   }
   else
   {
       do_differently = "No data available";
       //helpanotherperson = '<button class="btn btn-outline-custom active me-2 rounded-pill px-4">No</button>';
   }

   let comments = ""

   if (decisiondata.assessment.comments != "") {
     comments = decisiondata.assessment.comments;
   }
   else
   {
     comments = "No data available";
   }
   if (decisiondata.is_completed_assessment === "0") {
     comments = "No data available";
     do_differently = "No data available";
     helpanotherperson = "No data available";
     ontract = "No data available";
  }
      const htmlPath = path.resolve(__dirname,'htmlfiles', 'decisionpillars.html');
      let htmlContent = fs.readFileSync(htmlPath, 'utf8');
      htmlContent = htmlContent.replace('{{PathmakerimageTag}}', imageTag)
      htmlContent = htmlContent.replace('{{Pathmakerlogo}}', imageTaglogo)
      htmlContent = htmlContent.replace('{{formattedDate}}', formattedDate)
      htmlContent = htmlContent.replace('{{decisionpillartitle}}',decisiondata.opportunity.title);
      htmlContent = htmlContent.replace('{{ExperinceStatus}}',ExperinceStatus);
      htmlContent = htmlContent.replace('{{goals}}',goals);
      htmlContent = htmlContent.replace('{{successCriteria}}',successCriteria);
      htmlContent = htmlContent.replace('{{optionshtml}}',optionshtml);
      htmlContent = htmlContent.replace('{{decisions}}',decisions);
      htmlContent = htmlContent.replace('{{taskshtml}}',tasks);
      htmlContent = htmlContent.replace('{{tagslist}}',tagslist);
      htmlContent = htmlContent.replace('{{filesHTML}}',filesHTML);
      htmlContent = htmlContent.replace('{{getGrade}}',getGrade);
      htmlContent = htmlContent.replace('{{ontract}}', ontract)
      htmlContent = htmlContent.replace('{{ExperinceStatus}}', ExperinceStatus)
      htmlContent = htmlContent.replace('{{helpanotherperson}}', helpanotherperson)
      htmlContent = htmlContent.replace('{{do_differently}}', do_differently)
      htmlContent = htmlContent.replace('{{comments}}', comments)

      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
      });
    // Close the browser
    await browser.close();

    const safeTitle = decisiondata.opportunity.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const pdfKey = `output/${safeTitle}.pdf`; // Use a safe filename
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
        console.log(`PDF uploaded to S3 at: https://${bucketName}.s3.amazonaws.com/${pdfKey}`);
        return `https://${bucketName}.s3.amazonaws.com/${pdfKey}`; // Return the S3 URL
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw error; // Rethrow the error for further handling
    }

  }

    
  async awarnesspdfexport(observationData)
  {

      const browser = await puppeteer.launch({
        headless: true, // Run browser in headless mode for speed
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote'
        ], // Useful for some environments
    });
    const page = await browser.newPage();
  
      function getBase64Image(filePath) {
          let image = fs.readFileSync(filePath);
          return Buffer.from(image).toString('base64');
      }  
      function getSvgContent(filePath) {
          const svgContent = fs.readFileSync(filePath, 'utf8');
          return Buffer.from(svgContent).toString('base64');
      }
      const date = new Date(observationData.CreatedDate);
          const formattedDate = date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
      console.log("formattedDate",formattedDate);
      let base64Image = getBase64Image(path.resolve(__dirname, './htmlfiles/print-header-bg.jpg'));
      let base64Imagelogo = getBase64Image(path.resolve(__dirname, './htmlfiles/pathmaker-logo-w.png'));
      let base64ImageMP4 = getBase64Image(path.resolve(__dirname, './htmlfiles/1200x600.png'));
      let base64ImageMP4Svg = getSvgContent(path.resolve(__dirname, './htmlfiles/mp4.svg'));
      let base64ImagePDFSvg = getSvgContent(path.resolve(__dirname, './htmlfiles/PDF.svg'));

      let jpeglogo = getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/jpeg.png'));
      let pnglogo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/images.png'));
      let heiclogo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/heic.png'));          
      let movlogo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/mov.png'));  
      let mp33logo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/mpicon3.png'));
      let mp44logo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/mp4.png'));
      let pdflogo =  getBase64Image(path.resolve(__dirname,'./htmlfiles/Icons/pdf.png'));
            let ExperinceStatus = "";
            if (observationData.isCompletedAssessment==="1") {
              ExperinceStatus =`<button class="badge bg-primary p-2 px-3" type="submit">
                Closed
              </button>` ;
            }
            else
            {
              ExperinceStatus =`<button class="badge bg-primary p-2 px-3" type="submit">
              Active
            </button>`
            }
            let imageTag = `<img src="data:image/png;base64,${base64Image}" class="print-header-bg.jpg" style="width: 100%" alt="Image"/>`;
      let imageTaglogo = `<img src="data:image/png;base64,${base64Imagelogo}" class="img-fluid header-logo" alt="Pathmaker"/>`;
      let imageTagPng =  `<img alt="image" src="data:image/png;base64,${base64ImageMP4}" />`;
      
      let imageTagPDFSvg = `<img alt="image" src="data:image/svg+xml;base64,${base64ImagePDFSvg}" />`;
      let imageTagMP4 = `<img alt="image" src="data:image/svg+xml;base64,${base64ImageMP4Svg}" />`;
    
      const actions = observationData.actions && observationData.actions.length > 0 
    ? observationData.actions.map(action => `
        <div style="border: 1px solid #d3ded3; padding: 10px; display: inline-block; border-radius: 10px; margin-bottom: 10px; width: 100%;">
         <div><h4 class="text-custom subtitle">Name</h4></div>
         <div class="mb-3">${action.name}</div>
         <div><h4 class="text-custom subtitle">Insight</h4></div>
         <div class="mb-3">${action.insight}</div>
         <div><h4 class="text-custom subtitle">Analysis</h4></div>
         <div class="mb-3">${action.analysis}</div>
        </div>
    `).join('')
    : "<table><tbody><tr><td>No action available</td></tr></tbody></table>";
   
      const influences = observationData.influences && observationData.influences.length > 0 
    ? observationData.influences.map(influence => `
        <div style="border: 1px solid #d3ded3; padding: 10px; display: inline-block; border-radius: 10px; margin-bottom: 10px; width: 100%;">
                <div>
                    <h4 class="text-custom subtitle">Name</h4>
                </div>
                <div class="mb-3">${influence.name}</div>
                
                <div>
                    <h4 class="text-custom subtitle">Insight</h4>
                </div>
                <div class="mb-3">${influence.insight}</div>
                
                <div>
                    <h4 class="text-custom subtitle">Analysis</h4>
                </div>
                <div class="mb-3">${influence.analysis}</div>
            </div>`).join('')
    //: "<div>No influence available</div>";
    : "<table><tbody><tr><td>No influence available</td></tr></tbody></table>";

      const guidepost = observationData.guidepost && observationData.guidepost.length > 0 
    ? observationData.guidepost.map(guide => `
        <div style="border: 1px solid #d3ded3; padding: 10px; display: inline-block; border-radius: 10px; margin-bottom: 10px; width: 100%;">
            <div>
                <h4 class="text-custom subtitle">Name</h4>
            </div>
            <div class="mb-3">${guide.name}</div>
            
            <div>
                <h4 class="text-custom subtitle">Insight</h4>
            </div>
            <div class="mb-3">${guide.insight}</div>
            
            <div>
                <h4 class="text-custom subtitle">Analysis</h4>
            </div>
            <div class="mb-3">${guide.analysis}</div>
        </div>
  
    `).join('')
    : "<table><tbody><tr><td>No guidepost available</td></tr></tbody></table>";

      const mindset = observationData.mindset && observationData.mindset.length > 0 
      ? observationData.mindset.map(mind => `
        <div style="border: 1px solid #d3ded3; padding: 10px; display: inline-block; border-radius: 10px; margin-bottom: 10px; width: 100%;">
            <div>
                <h4 class="text-custom subtitle">Name</h4>
            </div>
            <div class="mb-3">${mind.name}</div>
            
            <div>
                <h4 class="text-custom subtitle">Insight</h4>
            </div>
            <div class="mb-3">${mind.insight}</div>
            
            <div>
                <h4 class="text-custom subtitle">Analysis</h4>
            </div>
            <div class="mb-3">${mind.analysis}</div>
        </div>

      `).join('')
      : "<table><tbody><tr><td>No self available</td></tr></tbody></table>";
  
      const emotions = observationData.emotions && observationData.emotions.length > 0 
    ? observationData.emotions.map(emotion => `
        <div style="border: 1px solid #d3ded3; padding: 10px; display: inline-block; border-radius: 10px; margin-bottom: 10px; width: 100%;">
            <div>
                <h4 class="text-custom subtitle">Name</h4>
            </div>
            <div class="mb-3">${emotion.name}</div>
            
            <div>
                <h4 class="text-custom subtitle">Insight</h4>
            </div>
            <div class="mb-3">${emotion.insight}</div>
            
            <div>
                <h4 class="text-custom subtitle">Analysis</h4>
            </div>
            <div class="mb-3">${emotion.analysis}</div>
        </div>

    `).join('')
    : "<table><tbody><tr><td>No emotion available</td></tr></tbody></table>";

    const tasks = observationData.tasks && observationData.tasks.length > 0 
? observationData.tasks.map(task => {       
    return `     
    <div style="border: 1px solid #d3ded3; padding: 10px; display: inline-block; border-radius: 10px; margin-bottom: 10px; width: 100%;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>${task.name}</div>
        <div>
            ${task.status === 0 
                ? '<button class="badge bg-primary p-2 px-3" type="button">Active</button>' 
                : '<button class="badge bg-success p-2 px-3" type="button">Closed</button>'}
        </div>
    </div>
</div>

    `;
}).join('')
: "<tbody><tr><td>No task available</td></tr></tbody>";
    // const tagslist = observationData.tags.map(tags => `<button class="btn btn-custom me-2 rounded-pill px-4">${tags}</button>`).join('');
    const tagslist = observationData.tags && observationData.tags.length > 0 
    ? observationData.tags.map(tag => `<button class="btn btn-custom me-2 rounded-pill px-4" style="margin-top: 10PX;">${tag}</button>`).join('') 
    : '<div>No tag available</div>';
let filesHTML = "";
console.log("observationData",observationData.files.length);
console.log("observationData.files",observationData.files);
filesHTML += `<table>`;
       if (observationData.files.length != 0) {
        observationData.files.forEach(element => {
               if (element.type==='application/pdf') {
                   filesHTML += `
                           <tr>
                               <td><div class="image-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${pdflogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               } 
               if (element.original_filename.includes('.mov')) {
                filesHTML += `
                        <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${movlogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>
                        `
            }
               if (element.original_filename.includes('.mp3')) {
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${mp33logo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
                           
               }
               if ((element.original_filename.includes('.mp4'))){
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${mp44logo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }
               if ((element.original_filename.includes('.wav'))){
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${mp44logo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }
               if ((element.original_filename.includes('.jpg') || element.original_filename.includes('.jpeg'))) {
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${jpeglogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }              
               if (element.original_filename.includes('.png')) {
                   filesHTML += `
                            <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${pnglogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }              
               if (element.original_filename.includes('.heic')) {
                   filesHTML += `
                           <tr>
                               <td><div class="audio-wrapper mb-4"><img alt="image" style="width:100px"; src="data:image/png;base64,${heiclogo}" /></div></td>
                               <td><div class="upper-heading ms-3 mb-4"><h3>${element.original_filename}</h3></div></td>
                           </tr>`
               }              
           });
       }
       else
       {
           filesHTML += `<tr><td>No file available</td></tr>`;
       }
              
       filesHTML += `</table>`   
        let getGrade = '';
          let inputGrade = observationData.assessment.grade;
          
          
          if (Number(inputGrade) === 0 && observationData.isCompletedAssessment === "1") {
            
            getGrade = ` <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                     Highly Dissatisfied
            </button> `;
            // getGrade = `
            // <ul class="grade">
            //     <li><span>A</span></li>
            //     <li><span>B</span></li>
            //     <li><span>C</span></li>
            //     <li><span>D</span></li>
            //     <li><span class="active">F</span></li>
            //   </ul>        
            // `;
          } else if (Number(inputGrade) === 1) {
            getGrade = ` <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                     Dissatisfied
            </button> `;
            //   getGrade = `
            //   <ul class="grade">
            //       <li><span>A</span></li>
            //       <li><span>B</span></li>
            //       <li><span>C</span></li>
            //       <li><span class='active'>D</span></li>
            //       <li><span>F</span></li>
            //     </ul>            
            //   `;
          } else if (Number(inputGrade) === 2) {
            getGrade = ` <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                     Neutral
            </button> `;
            //   getGrade = `
            //   <ul class="grade">
            //       <li><span>A</span></li>
            //       <li><span>B</span></li>
            //       <li><span class='active'>C</span></li>
            //       <li><span>D</span></li>
            //       <li><span>F</span></li>
            //     </ul>            
            //   `;
          } else if (Number(inputGrade) === 3) {
              //getGrade = "<ul class='grade'><li><li><span class='active'>B</span><li></ul>";
              getGrade = ` <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                     Satisfied
            </button> `;
            //   getGrade = `
            //   <ul class="grade">
            //       <li><span>A</span></li>
            //       <li><span class="active">B</span></li>
            //       <li><span>C</span></li>
            //       <li><span>D</span></li>
            //       <li><span>F</span></li>
            //     </ul>            
            //   `;
          } else if (Number(inputGrade) === 4) {
             // getGrade = "<ul class='grade'><li><li><span class='active'>A</span><li></ul>";
             getGrade = ` <button class="btn btn-outline-custom active me-2 rounded-pill px-4">
                          Highly Satisfied
                         </button> `;
            //   getGrade = `
            //   <ul class="grade">
            //       <li><span class='active'>A</span></li>
            //       <li><span>B</span></li>
            //       <li><span>C</span></li>
            //       <li><span>D</span></li>
            //       <li><span>F</span></li>
            //     </ul>            
            //   `;
          } else {
              getGrade = "<div class='alert alert-danger' role='alert'>Result not yet closed</div>";
          }

          
  
  let ontract = "";
  if (observationData.assessment.progressTowardsLifePurpose==="1") {
    ontract = '<button class="btn btn-outline-custom active me-2 rounded-pill px-4">Yes</button>';
}
else
{
    ontract = '<button class="btn btn-outline-custom active me-2 rounded-pill px-4">No</button>';
}

   
  let helpanotherperson = "";
  if (observationData.assessment.helpAnotherPerson==="1") {
      helpanotherperson = '<button class="btn btn-outline-custom active me-2 rounded-pill px-4">Yes</button>';
  }
  else
  {
      helpanotherperson = '<button class="btn btn-outline-custom active me-2 rounded-pill px-4">No</button>';
  }

  
  let do_differently = "";

  if (observationData.assessment.doDifferently !== "" && observationData.assessment.doDifferently !== null) {
    do_differently = observationData.assessment.doDifferently;
  }
   else
   {
    do_differently = 'No data available';
   }

   let comments = ""

   if (observationData.assessment.comments != "" && observationData.assessment.comments != null) {
     comments = observationData.assessment.comments;
   }
   else
   {
     comments = "No data available";
   }
   console.log("observationData.is_completed_assessment",observationData.is_completed_assessment);
   if (observationData.isCompletedAssessment === "0") {
    comments = "No data available";
    do_differently = "No data available";
    helpanotherperson = "No data available";
    ontract = "No data available";
}

      const htmlPath = path.resolve(__dirname,'htmlfiles', 'awarnesspillar.html');
      let htmlContent = fs.readFileSync(htmlPath, 'utf8');
      htmlContent = htmlContent.replace('{{PathmakerimageTag}}', imageTag)
      htmlContent = htmlContent.replace('{{Pathmakerlogo}}', imageTaglogo)
      htmlContent = htmlContent.replace('{{formattedDate}}', formattedDate)
      htmlContent = htmlContent.replace('{{decisionpillartitle}}',observationData.observation.title);
      htmlContent = htmlContent.replace('{{ExperinceStatus}}',ExperinceStatus);
      htmlContent = htmlContent.replace('{{actions}}',actions);
      htmlContent = htmlContent.replace('{{influences}}',influences);
      htmlContent = htmlContent.replace('{{guidepost}}',guidepost);
      htmlContent = htmlContent.replace('{{mindset}}',mindset);
      htmlContent = htmlContent.replace('{{emotions}}',emotions);
      htmlContent = htmlContent.replace('{{tasks}}',tasks);
      htmlContent = htmlContent.replace('{{tagslist}}',tagslist);
      htmlContent = htmlContent.replace('{{filesHTML}}',filesHTML);
      htmlContent = htmlContent.replace('{{getGrade}}',getGrade);
      htmlContent = htmlContent.replace('{{ontract}}', ontract)
      htmlContent = htmlContent.replace('{{ExperinceStatus}}', ExperinceStatus)
      htmlContent = htmlContent.replace('{{helpanotherperson}}', helpanotherperson)
      htmlContent = htmlContent.replace('{{do_differently}}', do_differently)
      htmlContent = htmlContent.replace('{{comments}}', comments)

      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    
      
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
      });
    // Close the browser
    await browser.close();

    
    const safeTitle = observationData.observation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const pdfKey = `output/${safeTitle}.pdf`; // Use a safe filename
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
        console.log(`PDF uploaded to S3 at: https://${bucketName}.s3.amazonaws.com/${pdfKey}`);
        return `https://${bucketName}.s3.amazonaws.com/${pdfKey}`; // Return the S3 URL
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw error; // Rethrow the error for further handling
    }

  }
  
}

module.exports = new pdfcreator;
//generatePDF().catch(err => console.error(err));
