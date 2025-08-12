if [ "$ver" == "" ]; then
ver=1.0.0
fi

echo "docker build -t \"scholtz2/biatec-scan-fe:$ver-main\" -f Dockerfile .."
docker build -t "scholtz2/biatec-scan-fe:$ver-main" -f Dockerfile .. || error_code=$?
error_code_int=$(($error_code + 0))
if [ $error_code_int -ne 0 ]; then
  echo "failed to build";
  exit 1;
fi

docker push "scholtz2/biatec-scan-fe:$ver-main" || error_code=$?
error_code_int=$(($error_code + 0))
if [ $error_code_int -ne 0 ]; then
  echo "failed to push";
  exit 1;
fi

echo "Image: scholtz2/biatec-scan-fe:$ver-main"