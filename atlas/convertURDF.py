import sys
import xml.etree.ElementTree as ET
import json

def convertVec(vec):
    return [float(v) for v in vec.split(" ")]

def convertStr(str):
    return "\"%s\"" % str

def strip_filename(fn):
    gps = fn.split("/")
    truefn = gps[-1]
    fnparts = truefn.split(".")
    return fnparts[0] + ".stl"

def doConversion(srcfn):
    tree = ET.parse(srcfn)
    root = tree.getroot()
    print(root)
    robot = root
    print(robot)
    links = dict()
    joints = dict()
    for child in robot:
        if child.tag == "link":
            lname = child.attrib["name"]
            print("LINK %s" % lname)
            visual = child.find("visual")
            print(visual)
            if not visual:
                continue

            origin = visual.find("origin")
            print(visual.find("geometry"))
            print(visual.find("geometry").find("mesh"))
            mesh = visual.find("geometry").find("mesh")
            print(mesh)
            if mesh is not None:
                vpos = convertVec(origin.attrib["xyz"])
                vrot = convertVec(origin.attrib["rpy"])
                vscale = convertVec(mesh.attrib["scale"])
                meshname = strip_filename(mesh.attrib["filename"])
                if not lname in links:
                    links[lname] = dict()
                links[lname]["vpos"] = vpos
                links[lname]["vrot"] = vrot
                links[lname]["vscale"] = vscale
                links[lname]["meshname"] = meshname
            else:
                print("Skipping %s" % lname)
        elif child.tag == "joint":
            lname = child.attrib["name"]
            print("JOINT %s" % lname)
            origin = child.find("origin")
            axis = child.find("axis")
            parent = child.find("parent")
            childchild = child.find("child")

            if origin is not None and axis is not None and parent is not None and childchild is not None:
                vpos = convertVec(origin.attrib["xyz"])
                vrot = convertVec(origin.attrib["rpy"])
                axis = convertVec(axis.attrib["xyz"])
                parent_name = parent.attrib["link"]
                child_name = childchild.attrib["link"]

                if not lname in joints:
                    joints[lname] = dict()
                joints[lname]["vpos"] = vpos
                joints[lname]["vrot"] = vrot
                joints[lname]["axis"] = axis
                joints[lname]["parent"] = parent_name
                joints[lname]["child"] = child_name
    return (links, joints)

if __name__ == '__main__':
    links, joints = doConversion(sys.argv[1])
    stuff = {"links": links, "joints": joints}
    with open(sys.argv[2], "wt") as dest:
        dest.write(json.dumps(stuff, indent=4, sort_keys=True))


    # <origin rpy="0 -0 0" xyz="0 0 -0.422"/>
    # <axis xyz="0 1 0"/>
    # <parent link="r_lleg"/>
    # <child link="r_talus"/>