set -eux
for fname in *html ; do 
  sed -i '' 's@Trevorese@Sesowi@g' $fname
done
for fname in *js ; do 
  sed -i '' 's@Trevorese@Sesowi@g' $fname
done
for fname in ../*md ; do 
  sed -i '' 's@Trevorese@Sesowi@g' $fname
done
