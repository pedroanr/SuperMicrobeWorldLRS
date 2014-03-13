#!/bin/sh
cd ~/git/SuperMicrobeWorldLRS;
echo $pwd;
git init;
git add .;
git status;
echo "Insert here the comment of the commit: ";
read comment;
git commit -m "$comment"; #Try without ""
git push heroku master; 
