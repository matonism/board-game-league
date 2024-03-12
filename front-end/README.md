# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `yarn start` or `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build` -- use this when we want to deploy to S3

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `yarn build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

### Steps to create a google console app to link sheets with nodejs

https://www.section.io/engineering-education/google-sheets-api-in-nodejs/

### Steps to deploy to S3 bucket

https://www.newline.co/fullstack-react/articles/deploying-a-react-app-to-s3/

npm run build in vs code
create new s3 bucket
upload all files from new build folder
ensure the public can read all the files by assigning manual permissions
enable static website hosting under the bucket's properties
follow new link generated for static website hosting

To handle React Router in S3:
Navigate to static website hosting settings under properties in S3 bucket
set the error document to index.js or index.html (whichever you are using above)

To upload server to lambda:
Set up AWS Gateway for HTTP (not REST - this may work, but I could not find a way initially)
Add CORS policies to AWS Gateway
Wrap express server in serverless framework
ensure MongoDB accepts all incoming requests from all IPs under Network Access (or find out how to specifically designate the AWS Gateway's IP)
zip the files needed and upload them to lambda
Add CORS policies to AWS Gateway


The stack is as follows
Front End - React/NodeJS
Back End - NodeJS/Lambda
Navigation/URL Service - API Gateway




To toggle between development and production
- open a terminal in command prompt (not powershell)
- run: SET NODE_ENV=development

How to create-react-app with service-worker
- npx create-react-app my-app --template cra-template-pwa

How to serve a static version of a react app
- npm install -g serve
- serve -s build

To add https:
- Procur Route53 Domain Name
- Create Cloudfront distribution
- Create Certificate with ACM
    - Add the provided DNS records to the Route53 Hosted Zone
    - You can do this from ACM by clicking Create records in Route53
    - This is needed to verify ownership
- Add Certificate to Route53 Domain
    - Make sure your Route53 Domain Names Nameservers match your Route53 Hosted Zone Nameservers
- Add Certificate to Route53 config along with CNAME records (www.example.com, example.com)
- Ensure your Cloudfront -> Behavior -> edit shows that HTTP redirects to HTTPS


To point AWS Hosted Zone (Domain Name) to an S3 bucket
- Register a domain name (Route 53)
    - Allow the Hosted Zone to get created automatically
- Create a S3 bucket with the same name as the domain name including the extension (S3)
    - ex: DN: michaelmatonis.com - Bucket Name must be "michaelmatonis.com"
    - Allow public access
    - Navigate to properties tab after creation 
        - Scroll to the bottom and enable static website hosting
- Return to Route 53 and create an "A" record on the hosted zone
    - Configure to point to your newly created S3 bucket