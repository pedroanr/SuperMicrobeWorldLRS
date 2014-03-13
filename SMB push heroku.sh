#!/bin/sh
cd ~/git/SuperMicrobeWorldLRS;
echo $pwd;
git init;
git add .;
git status;
echo "Insert here the comment of the commit: ";
read comment;
if [$comment != '']
then
git commit -m "$comment";
else
git commit;
fi
git push heroku master; 
