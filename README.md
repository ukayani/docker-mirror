# sample-node-ecs

An example node application which deploys to AWS ECS.


# Requirements

- Node v6.x or greater

# Publishing a new version

### Creating a repository

You must first create an ECR repository which will host your docker images.
To create the ECR repository you can use the following Cloud Formation Template: [ECR](https://github.com/LoyaltyOne/apollo-platform/blob/master/common/ecs/Repository.yml)
**note**: With the provided CF template, the repository will typically be created in a production level AWS account, access will be shared to dev

Once the repository is created, you will need to modify the `docker-registry` setting
in `package.json` to point to the correct account

### AWS Credentials

Once the repository is created you will need to add AWS Credentials to the travis.yml via the `travis encrypt`
command. These credentials must have access to push images to the created ECR repository.

The travis file must contain the following exports:

- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION

### Publishing

To publish a new version of the application you will need to install `releaseme`

**Installing releaseme**
```bash
$ npm install -g releaseme
```

To publish a new version of the application, use the `releaseme` command in the project root. This
command will run series of steps to update the version of the app and create a tagged release.
The tagged release (git tag) will trigger a travis build which will build a docker
image and push it to AWS ECR.

To see the steps run during the release process see the `releaseme` property in the `package.json`

Once the travis build is complete you should see the new version in your ECR repository.

# Deployment to ECS

## Requirements
- Must have an existing ECS cluster. Use [ECS Cluster Template](https://github.com/LoyaltyOne/apollo-platform/blob/master/common/ecs/Cluster.yml)

### Installing required tools

**ecs-service**

To assist in deploying our service to ECS we will use [ecs-service](https://github.com/ukayani/ecs-service)

```bash
$ npm install -g ecs-service
```

**kms-env**

To help secure our sensitive environment variables we will use [kms-env](https://github.com/ukayani/kms-env)

```bash
$ npm install -g kms-env
```

Assuming you have a cluster called `dev-services` you can deploy/create
the sample play service with `ecs-service`

1. Update the params.json file's `ClusterStackName` to `dev-services`
2. Run the following command in the `env` folder:

```bash
$ ecs-service deploy dev-node-sample 0.6.3 service.json params.json --env-file dev.env --tag-file tags.json
```

The above command will create and run the sample node application version 0.6.3, you can specify any published version here.

The service will be accessible at the load balancer DNS under the prefix `/node` by default.
The prefix can be changed in the `env/params.json` file.

**service.json**

The `service.json` contains the Cloud Formation template to create all resources associated with the ECS service

- Task Definition
- Target Group + Listener Rule
- Service Definition
- Task Role
- Service Autoscaling components

**note**: this file should remain the same across all environments.
The `params.json` and `*.env` files will change per environment.

**params.json**

The `params.json` contains the stack parameters for the service template.

**dev.env**

The `dev.env` file is a standard environment variable file which contains variables for
the application. These variables will be available to the container when it runs.

For this node application we use the `APP_SECRET` to provide an encrypted secret to the application at launch

You can create other `.env` files with the `kms-env init` command.

# Updating application version

If you have already deployed the application to ECS,
you can use the simpler `ecs-service update` command as follows:

**Updating application version**
```bash
$ ecs-service update dev-node-sample 0.6.4
```

**Updating environment variables while keeping same version**
```bash
$ ecs-service update dev-node-sample current --env-file dev.env
```


## Creating your own service for use with ECS
In order to deploy your very own Node.JS application to ECS, you need to
do the following:

- Ensure your application's endpoints support prefixes, for example if
your path is `/api/example` and the prefix is `/xyz` then hitting
`/xyz/api/example` should be respected. This can be achieved using
[Restify Router](https://github.com/ukayani/restify-router#prefixing-routes)
if you are using [Restify](https://github.com/restify/node-restify).
[Express.JS](https://expressjs.com/) offers similar functionality.

- Make sure you have [`docker-build-run-push`](https://www.npmjs.com/package/docker-build-run-push)
in your dependencies

- Make sure you have all the `gulp` plugins in order to run the following
`gulp` tasks to prepare your Node.JS application as a deployable 
artifact for packaging as a Docker image:
    - Example: 
    ```javascript
const install = require('gulp-install');
const del = require('del');
const prodFiles = libFiles.concat(['package.json', 'start.sh']);
    
gulp.task('clean', () => {
  return del(['dist']);
});

gulp.task('dist', ['clean'], () => {
  return gulp.src(prodFiles, {base: '.'})
             .pipe(gulp.dest('./dist'))
             .pipe(install({production: true}));
});
    ```
