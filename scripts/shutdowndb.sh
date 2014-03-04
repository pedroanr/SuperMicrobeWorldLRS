#!/bin/sh

#~/Applications/mongodb/bin/mongod --shutdown
FILE="/Users/admin/git/lrs/scripts/shutdowndb.js";
echo "Current script to execute: $FILE";
echo "If it's not working take a look to de route of the js file";
~/Applications/mongodb/bin/mongo $FILE
