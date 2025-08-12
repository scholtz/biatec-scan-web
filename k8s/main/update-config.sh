kubectl apply -f deployment-fe.yaml -n biatec-scan
kubectl delete configmap biatec-scan-fe-main-conf -n biatec-scan
kubectl create configmap biatec-scan-fe-main-conf --from-file=conf-fe -n biatec-scan
kubectl rollout restart deployment/biatec-scan-fe-app-deployment -n biatec-scan
kubectl rollout status deployment/biatec-scan-fe-app-deployment -n biatec-scan