pipeline {
    agent any
    environment {
        DOCKER_IMAGE = 'zeeshanarif19/wordrush-backend:latest'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                sh '/var/jenkins_home/bin/docker build -t $DOCKER_IMAGE -f backend/Dockerfile .'
            }
        }

        stage('Push to Docker Hub') {
            steps {
                echo 'Logging into Docker Hub and pushing image...'
                // Uses Jenkins credentials with ID 'docker-hub-credentials'
                withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', passwordVariable: 'DOCKER_PASSWORD', usernameVariable: 'DOCKER_USERNAME')]) {
                    sh 'echo "$DOCKER_PASSWORD" | /var/jenkins_home/bin/docker login -u "$DOCKER_USERNAME" --password-stdin'
                    sh '/var/jenkins_home/bin/docker push $DOCKER_IMAGE'
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                echo 'Deploying to K3s cluster...'
                // Since the Deployment yaml is inside the repo under 'k8s/deployment.yaml', 
                // we apply the config to ensure limits are updated, then trigger a rolling restart.
                sh '/var/jenkins_home/bin/kubectl apply -f k8s/deployment.yaml -n default'
                sh '/var/jenkins_home/bin/kubectl rollout restart deployment/wordrush-backend -n default'
                sh '/var/jenkins_home/bin/kubectl rollout status deployment/wordrush-backend -n default --timeout=60s'
            }
        }
    }
}
