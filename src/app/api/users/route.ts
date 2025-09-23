import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";


export async function DELETE(req: Request) {
  const userEmail=req.headers.get("email");
//   const user=getUserByEmail(userEmail as string);
// const {password , confirmPassword}= await req.json();
    if(!userEmail){
        return NextResponse.json({error:"Unauthorized",success:false}, {status:401});
    }
    const deletedUser=await prisma.users.delete({
        where:{email:userEmail},
        select:{email:true}
    });
    if(!deletedUser){
        return NextResponse.json({error:"User not found",success:false},{status:404});
    }
    return NextResponse.json({message:`${deletedUser.email} deleted successfully`,success:true},{status:200});
}
export async function PATCH(req: Request){
    const userEmail=req.headers.get("email");
    if(!userEmail){
        return NextResponse.json({error:"Unauthorized",success:false}, {status:401});
    }
    const {name,department,bio,phone,location}= await req.json();
    const updatedUser=await prisma.users.update({
        where:{email:userEmail},
        data:{name,department,bio,phone,location},
        select:{name:true,email:true,role:true,employeeCode:true,department:true,bio:true,phone:true,location:true}
    });
    if(!updatedUser){
        return NextResponse.json({error:"User not found",success:false},{status:404});
    }
    return NextResponse.json({message:"Profile updated successfully",user:updatedUser,success:true},{status:200});

}
